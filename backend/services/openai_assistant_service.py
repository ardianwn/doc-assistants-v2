"""
OpenAI Assistants API Service with Local Qdrant Vector Store
Best of both worlds: OpenAI intelligence + Local data privacy
"""

import logging
import json
import time
import asyncio
import re
from typing import Dict, Optional, List
from openai import AsyncOpenAI
from config import settings, vectorstore
from services.vectorstore import HybridRetriever
from services.date_parser_service import parse_multiple_dates_from_question
from services.query_analyzer import analyze_query_and_get_dates
from utils.language_detect import detect_language

logger = logging.getLogger(__name__)


class OpenAIAssistantService:
    """OpenAI Assistants API with function calling to local Qdrant vectorstore"""
    
    def __init__(self):
        if not settings.OPENAI_API_KEY or settings.OPENAI_API_KEY == "your_openai_api_key_here":
            raise ValueError("OpenAI API key not configured")
        
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = settings.OPENAI_CHAT_MODEL
        self.hybrid_retriever = HybridRetriever(vectorstore)
        self.assistant_id = None  # Will be created on first use
    
    async def _get_or_create_assistant(self, language: str = "id") -> str:
        """Get existing assistant or create new one"""
        
        if self.assistant_id:
            return self.assistant_id
        
        # Define assistant configuration
        if language == "id":
            name = "DocAI Document Analyst"
            instructions = """Anda adalah asisten AI ahli yang menganalisis berbagai jenis dokumen (laporan, kontrak, manual, artikel, dll).

PENTING - CARA KERJA TANGGAL:
- Database berisi berbagai jenis dokumen dengan berbagai tanggal
- System backend akan OTOMATIS memberikan tanggal yang relevan lewat [SYSTEM HINT]
- JANGAN menebak atau assume tanggal tertentu
- SELALU gunakan tanggal dari [SYSTEM HINT] yang diberikan backend
- Jika user bertanya tanggal spesifik (misal: "1 Maret"), system akan berikan tanggal itu
- Jika user bertanya range/komparatif (misal: "tren minggu ini"), system akan berikan semua tanggal relevan
- Jika tidak ada [SYSTEM HINT], tanyakan ke user tanggal mana yang ingin dianalisis

CARA KERJA:
1. Pahami pertanyaan user tentang dokumen apa saja (laporan, kontrak, artikel, dll)
2. WAJIB cek [SYSTEM HINT] untuk mendapat tanggal yang benar dari backend (jika relevan)
3. Gunakan function 'retrieve_documents' dengan query yang tepat dan tanggal dari [SYSTEM HINT]
4. JANGAN pernah gunakan tanggal selain yang diberikan [SYSTEM HINT]
5. Untuk pertanyaan komparatif, backend akan berikan multiple tanggal - gunakan SEMUA
6. Setelah mendapat dokumen, analisis dengan teliti:
   - Untuk dokumen teknis/laporan: ekstrak data numerik, metrik, target
   - Untuk kontrak/legal: ekstrak klausul penting, tanggal, pihak terkait
   - Untuk artikel/manual: ekstrak informasi relevan, langkah-langkah, prosedur
7. Berikan jawaban lengkap dengan:
   - Informasi relevan dari dokumen
   - Sumber (file dan halaman)
   - Analisis atau ringkasan sesuai jenis dokumen
   - Kesimpulan yang jelas

FORMAT JAWABAN:
- Gunakan struktur yang jelas dengan heading
- Untuk data numerik, gunakan format: "Target / Achieved: X / Y (Loss/Save: Z%)"
- Untuk informasi umum, gunakan bullet points atau paragraf yang terstruktur
- Pisahkan setiap bagian dengan heading yang jelas
- Di akhir, berikan section "Kesimpulan:" atau "Ringkasan:" untuk summary
- Sertakan sumber di setiap section: "Sumber: [Nama File], halaman [X]"

ATURAN PENTING:
- SELALU prioritaskan [SYSTEM HINT] untuk tanggal
- Jangan katakan "data tidak tersedia" sebelum mencoba retrieve
- Berikan jawaban yang akurat dari dokumen
- Sertakan sumber untuk setiap data/informasi yang Anda sebutkan
- Jika tidak ada [SYSTEM HINT] dan pertanyaan memerlukan tanggal, minta clarifikasi ke user
- Untuk pertanyaan umum tanpa tanggal, retrieve dokumen berdasarkan keyword/topik saja"""
        else:
            name = "DocAI Document Analyst"
            instructions = """You are an expert AI assistant for analyzing various types of documents (reports, contracts, manuals, articles, etc.).

IMPORTANT - HOW DATES WORK:
- Database contains various types of documents with various dates
- Backend system will AUTOMATICALLY provide relevant dates via [SYSTEM HINT]
- NEVER guess or assume specific dates
- ALWAYS use dates from [SYSTEM HINT] provided by backend
- If user asks specific date (e.g., "March 1st"), system will provide that date
- If user asks range/comparative (e.g., "this week's trend"), system will provide all relevant dates
- If no [SYSTEM HINT], ask user which dates to analyze

HOW TO WORK:
1. Understand user's question about any type of document (reports, contracts, articles, etc.)
2. MUST check [SYSTEM HINT] to get correct dates from backend (if applicable)
3. Use 'retrieve_documents' function with appropriate query and dates from [SYSTEM HINT]
4. NEVER use dates other than those provided by [SYSTEM HINT]
5. For comparative questions, backend will provide multiple dates - use ALL of them
6. After getting documents, analyze carefully based on document type:
   - For technical/reports: extract numerical data, metrics, targets
   - For contracts/legal: extract important clauses, dates, parties involved
   - For articles/manuals: extract relevant information, steps, procedures
7. Provide complete answer with:
   - Relevant information from documents
   - Sources (file and page)
   - Analysis or summary based on document type
   - Clear conclusion

ANSWER FORMAT:
- Use clear structure with headings
- For numerical data, use format: "Target / Achieved: X / Y (Loss/Save: Z%)"
- For general information, use bullet points or structured paragraphs
- Separate each section with clear headings
- At the end, provide "Conclusion:" or "Summary:" section
- Include sources in each section: "Source: [File Name], page [X]"

CRITICAL RULES:
- ALWAYS prioritize [SYSTEM HINT] for dates
- Don't say "data not available" before trying to retrieve
- Provide accurate answers from documents
- Include sources for every data point or information you mention
- If no [SYSTEM HINT] and question requires dates, ask user for clarification
- For general questions without dates, retrieve documents based on keywords/topics only"""
        
        # Define tools/functions
        tools = [
            {
                "type": "function",
                "function": {
                    "name": "retrieve_documents",
                    "description": "Retrieve documents from local vectorstore based on query and dates. Use this to get actual data from any type of document (reports, contracts, manuals, articles, etc.). Works with or without date filtering.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "Search query to retrieve relevant documents. Include relevant keywords based on document type (e.g., unit names, metrics, contract terms, procedure steps, topics, etc.)."
                            },
                            "dates": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "Optional: List of dates in YYYY-MM-DD format to filter documents by date. Leave empty [] if the question doesn't require date filtering (e.g., general document search). Provide ALL relevant dates for time-specific questions. Example: ['2025-03-01', '2025-03-02', '2025-03-03'] for a 3-day range."
                            }
                        },
                        "required": ["query"]
                    }
                }
            }
        ]
        
        try:
            # Create assistant
            assistant = await self.client.beta.assistants.create(
                name=name,
                instructions=instructions,
                model=self.model,
                tools=tools
            )
            
            self.assistant_id = assistant.id
            logger.info(f"[ASSISTANT] Created new assistant: {self.assistant_id}")
            print(f"✅ [ASSISTANT] Created: {self.assistant_id}")
            
            return self.assistant_id
        
        except Exception as e:
            logger.error(f"[ASSISTANT] Error creating assistant: {str(e)}")
            raise
    
    async def _retrieve_documents_function(
        self, 
        query: str, 
        dates: List[str] = None
    ) -> str:
        """
        Function called by OpenAI Assistant to retrieve documents from local Qdrant
        Supports both date-filtered and general document retrieval
        Returns JSON string with retrieved documents
        """
        try:
            print(f"🔍 [ASSISTANT TOOL] retrieve_documents called")
            print(f"   Query: {query}")
            print(f"   Dates: {dates} (total: {len(dates) if dates else 0})")
            logger.info(f"[ASSISTANT TOOL] retrieve_documents called with query='{query}', dates={dates}")
            
            all_docs = []
            
            # Check if dates are provided
            if dates and len(dates) > 0:
                # Multi-date retrieval (parallel) - for date-specific queries
                import asyncio
                
                async def retrieve_for_date(date: str):
                    filters = {"date": date}
                    print(f"🔍 [ASSISTANT TOOL] Retrieving for date: {date}")
                    docs = await self.hybrid_retriever.retrieve_async(
                        query, 
                        k_dense=15,      # Increased from 10 for better recall
                        k_bm25=15,       # Increased from 10 for better recall
                        final_k=5,       # Increased from 3 - 5 best docs per date (balance recall vs tokens)
                        filters=filters
                    )
                    print(f"✅ [ASSISTANT TOOL] Date {date}: Found {len(docs)} documents")
                    return docs
                
                results = await asyncio.gather(*[retrieve_for_date(date) for date in dates])
                for docs in results:
                    all_docs.extend(docs)
            else:
                # General document retrieval without date filter - for topic-based queries
                print(f"🔍 [ASSISTANT TOOL] Retrieving documents without date filter (general search)")
                docs = await self.hybrid_retriever.retrieve_async(
                    query, 
                    k_dense=20,      # More docs for general search
                    k_bm25=20,       # More docs for general search
                    final_k=10,      # Return top 10 most relevant docs
                    filters=None     # No date filtering
                )
                all_docs = docs
                print(f"✅ [ASSISTANT TOOL] General search: Found {len(docs)} documents")
            
            print(f"📊 [ASSISTANT TOOL] Total docs: {len(all_docs)}")
            
            # Remove duplicates
            seen = set()
            unique_docs = []
            for doc in all_docs:
                content_hash = hash(doc.page_content[:100])
                if content_hash not in seen:
                    seen.add(content_hash)
                    unique_docs.append(doc)
            
            print(f"📊 [ASSISTANT TOOL] After dedup: {len(unique_docs)} unique docs")
            
            # Limit to max 20 docs total (balance between recall and token usage)
            # With 5 docs per date × ~4 dates avg = 20 docs reasonable
            all_docs = unique_docs[:20]
            
            # Show date distribution
            date_counts = {}
            for doc in all_docs:
                doc_date = getattr(doc, 'metadata', {}).get('date', 'N/A')
                date_counts[doc_date] = date_counts.get(doc_date, 0) + 1
            print(f"📅 [ASSISTANT TOOL] Date distribution: {date_counts}")
            
            # Format documents as JSON
            documents = []
            for i, doc in enumerate(all_docs):
                content = getattr(doc, 'page_content', '')
                metadata = getattr(doc, 'metadata', {})
                
                # Aggressive truncate - max 1000 chars per doc to prevent token overflow
                if len(content) > 1000:
                    content = content[:1000] + "..."
                
                documents.append({
                    "id": i + 1,
                    "content": content,
                    "file": metadata.get('file', 'Unknown'),
                    "page": metadata.get('page', 'N/A'),
                    "date": metadata.get('date', 'N/A')
                })
            
            result = json.dumps({
                "total_documents": len(documents),
                "documents": documents,
                "date_distribution": date_counts
            }, ensure_ascii=False, indent=2)
            
            print(f"✅ [ASSISTANT TOOL] Returning {len(documents)} documents")
            print(f"📏 [ASSISTANT TOOL] Total result size: {len(result)} chars (~{len(result)//4} tokens)")
            return result
        
        except Exception as e:
            logger.error(f"[ASSISTANT TOOL] Error: {str(e)}")
            return json.dumps({
                "error": str(e),
                "total_documents": 0,
                "documents": []
            })
    
    async def chat_with_assistant(
        self,
        user_query: str,
        thread_id: Optional[str] = None
    ) -> tuple[str, str]:
        """
        Chat with OpenAI Assistant
        
        Args:
            user_query: User's question
            thread_id: Optional thread ID for conversation continuity
            
        Returns:
            (response_text, thread_id)
        """
        start_time = time.time()
        
        try:
            # ===== DEBUG SECTION START =====
            print(f"🔍 [DEBUG] user_query RAW: '{user_query}'")
            print(f"🔍 [DEBUG] user_query TYPE: {type(user_query)}")
            print(f"🔍 [DEBUG] user_query LENGTH: {len(user_query)}")
            
            # Pre-parse dates from query using backend intelligence
            print(f"🔍 [DEBUG] Calling parse_multiple_dates_from_question()...")
            parsed_dates = parse_multiple_dates_from_question(user_query)
            print(f"🔍 [DEBUG] parse_multiple_dates result: {parsed_dates}")
            
            print(f"🔍 [DEBUG] Calling analyze_query_and_get_dates()...")
            dates_to_use, strategy = analyze_query_and_get_dates(user_query, parsed_dates)
            print(f"🔍 [DEBUG] analyze_query_and_get_dates result: dates={dates_to_use}, strategy={strategy}")
            # ===== DEBUG SECTION END =====
            
            print(f"🔍 [ASSISTANT] Backend pre-parsed {len(dates_to_use) if dates_to_use else 0} dates: {dates_to_use}")
            logger.info(f"[ASSISTANT] Backend pre-parsed dates: {dates_to_use} (strategy: {strategy})")
            
            # Get or create assistant
            detected_lang = detect_language(user_query)
            assistant_id = await self._get_or_create_assistant(detected_lang)
            
            # Create or use existing thread
            if thread_id:
                print(f"🔄 [ASSISTANT] Using existing thread: {thread_id}")
            else:
                thread = await self.client.beta.threads.create()
                thread_id = thread.id
                print(f"✨ [ASSISTANT] Created new thread: {thread_id}")
            
            # Get available dates from database
            from db.database import get_available_dates, get_date_range_info
            date_range_info = get_date_range_info()
            available_dates = date_range_info.get("available_dates", [])
            
            print(f"📅 [ASSISTANT] Available dates in DB: {len(available_dates)} dates")
            print(f"📅 [ASSISTANT] Date range: {date_range_info.get('min_date')} to {date_range_info.get('max_date')}")
            
            # Handle "all_available" strategy - inject all available dates
            if strategy == "all_available" and available_dates:
                dates_to_use = available_dates
                print(f"🔄 [ASSISTANT] Strategy 'all_available' - injecting ALL {len(available_dates)} dates from DB")
            
            # Handle "latest" strategy - inject most recent date only
            elif strategy == "latest" and available_dates:
                # Get ONLY the most recent date for "latest" queries
                dates_to_use = [sorted(available_dates, reverse=True)[0]]  # Only the latest date
                print(f"🔄 [ASSISTANT] Strategy 'latest' - injecting ONLY the most recent date: {dates_to_use}")
            
            # Inject date hints into user message if dates were detected
            enhanced_query = user_query
            if dates_to_use and len(dates_to_use) > 0:
                if detected_lang == "id":
                    if strategy == "latest":
                        date_hint = f"\n\n[SYSTEM HINT: User bertanya tentang data TERAKHIR/TERBARU. Backend telah mengidentifikasi tanggal TERBARU di database: {dates_to_use[0]}. Gunakan HANYA tanggal ini saat memanggil retrieve_documents. Fokus pada data dari tanggal ini saja, jangan tampilkan data tanggal lain. Tanggal tersedia di database: {date_range_info.get('min_date')} s/d {date_range_info.get('max_date')} ({len(available_dates)} tanggal)]"
                    else:
                        date_hint = f"\n\n[SYSTEM HINT: Backend telah mendeteksi tanggal yang relevan untuk query ini: {dates_to_use}. Gunakan TANGGAL INI saat memanggil retrieve_documents, jangan menebak tanggal sendiri. Tanggal tersedia di database: {date_range_info.get('min_date')} s/d {date_range_info.get('max_date')} ({len(available_dates)} tanggal)]"
                else:
                    if strategy == "latest":
                        date_hint = f"\n\n[SYSTEM HINT: User is asking about LATEST/MOST RECENT data. Backend has identified the MOST RECENT date in database: {dates_to_use[0]}. Use ONLY this date when calling retrieve_documents. Focus on data from this date only, don't show data from other dates. Available dates in database: {date_range_info.get('min_date')} to {date_range_info.get('max_date')} ({len(available_dates)} dates)]"
                    else:
                        date_hint = f"\n\n[SYSTEM HINT: Backend detected relevant dates for this query: {dates_to_use}. Use THESE DATES when calling retrieve_documents, don't guess dates yourself. Available dates in database: {date_range_info.get('min_date')} to {date_range_info.get('max_date')} ({len(available_dates)} dates)]"
                
                enhanced_query = user_query + date_hint
                print(f"💡 [ASSISTANT] Injected date hint into message")
            else:
                # No dates detected - check strategy to determine hint
                if strategy == "no_filter":
                    # General document query (SOP, manual, etc.) - NO need to mention dates
                    print(f"📄 [ASSISTANT] General document query detected (strategy: no_filter) - NO date hint needed")
                    if detected_lang == "id":
                        date_hint = f"\n\n[SYSTEM HINT: Ini adalah query untuk dokumen UMUM (SOP/manual/kebijakan/prosedur). JANGAN gunakan filter tanggal. Panggil retrieve_documents dengan dates=[] (kosong) untuk mencari di SEMUA dokumen berdasarkan topik/keyword saja.]"
                    else:
                        date_hint = f"\n\n[SYSTEM HINT: This is a GENERAL document query (SOP/manual/policy/procedure). DO NOT use date filtering. Call retrieve_documents with dates=[] (empty) to search ALL documents based on topic/keywords only.]"
                    
                    enhanced_query = user_query + date_hint
                else:
                    # Other strategies - may need date clarification
                    print(f"⚠️ [ASSISTANT] No dates detected - assistant may ask user for clarification (strategy: {strategy})")
                    if detected_lang == "id":
                        date_hint = f"\n\n[SYSTEM HINT: Query tidak menyebutkan tanggal spesifik. Database memiliki dokumen untuk tanggal: {date_range_info.get('min_date')} s/d {date_range_info.get('max_date')} ({len(available_dates)} tanggal). Jika query memerlukan data spesifik dari tanggal tertentu, tanyakan ke user tanggal mana yang ingin dianalisis. Jika query bersifat umum, gunakan dates=[] untuk search tanpa filter tanggal.]"
                    else:
                        date_hint = f"\n\n[SYSTEM HINT: Query doesn't mention specific dates. Database has documents for dates: {date_range_info.get('min_date')} to {date_range_info.get('max_date')} ({len(available_dates)} dates). If query needs specific date data, ask user which dates to analyze. If query is general, use dates=[] to search without date filter.]"
                    
                    enhanced_query = user_query + date_hint
            
            # Add message to thread
            await self.client.beta.threads.messages.create(
                thread_id=thread_id,
                role="user",
                content=enhanced_query
            )
            
            print(f"💬 [ASSISTANT] User message added to thread")
            
            # Run assistant
            run = await self.client.beta.threads.runs.create(
                thread_id=thread_id,
                assistant_id=assistant_id
            )
            
            print(f"🏃 [ASSISTANT] Run started: {run.id}")
            
            # Poll for completion
            max_attempts = 60  # 60 seconds timeout
            attempt = 0
            
            while attempt < max_attempts:
                run = await self.client.beta.threads.runs.retrieve(
                    thread_id=thread_id,
                    run_id=run.id
                )
                
                print(f"⏳ [ASSISTANT] Run status: {run.status}")
                
                if run.status == "completed":
                    break
                
                elif run.status == "requires_action":
                    # Handle function calls
                    tool_calls = run.required_action.submit_tool_outputs.tool_calls
                    print(f"🔧 [ASSISTANT] Requires action: {len(tool_calls)} tool calls")
                    
                    tool_outputs = []
                    
                    for tool_call in tool_calls:
                        function_name = tool_call.function.name
                        function_args = json.loads(tool_call.function.arguments)
                        
                        print(f"🔧 [ASSISTANT] Calling: {function_name}")
                        print(f"   Args: {function_args}")
                        
                        if function_name == "retrieve_documents":
                            output = await self._retrieve_documents_function(
                                query=function_args.get("query"),
                                dates=function_args.get("dates", [])
                            )
                            
                            tool_outputs.append({
                                "tool_call_id": tool_call.id,
                                "output": output
                            })
                    
                    # Submit tool outputs
                    run = await self.client.beta.threads.runs.submit_tool_outputs(
                        thread_id=thread_id,
                        run_id=run.id,
                        tool_outputs=tool_outputs
                    )
                    
                    print(f"✅ [ASSISTANT] Tool outputs submitted")
                
                elif run.status in ["failed", "cancelled", "expired"]:
                    error_msg = f"Run {run.status}: {run.last_error}"
                    logger.error(f"[ASSISTANT] {error_msg}")
                    raise Exception(error_msg)
                
                await asyncio.sleep(1)
                attempt += 1
            
            if attempt >= max_attempts:
                raise Exception("Assistant run timeout")
            
            # Get messages
            messages = await self.client.beta.threads.messages.list(
                thread_id=thread_id,
                order="desc",
                limit=1
            )
            
            # Extract assistant's response
            assistant_message = messages.data[0]
            response_text = ""
            
            for content in assistant_message.content:
                if content.type == "text":
                    response_text += content.text.value
            
            # Format the response for better readability
            response_text = self._format_assistant_response(response_text)
            
            elapsed = time.time() - start_time
            print(f"⚡ [ASSISTANT] Completed in {elapsed:.2f}s")
            logger.info(f"[ASSISTANT] Completed in {elapsed:.2f}s")
            
            return response_text, thread_id
        
        except Exception as e:
            logger.error(f"[ASSISTANT] Error: {str(e)}")
            raise
    
    def _format_assistant_response(self, response_text: str) -> str:
        """
        Format assistant response untuk tampilan yang lebih rapi
        Mengubah format plain text menjadi markdown yang terstruktur dengan emoji dan sections
        """
        
        if not response_text or len(response_text.strip()) < 10:
            return response_text
        
        # Conservative detection - only format if very clear indicators present
        has_nphr_data = bool(re.search(r'\d{1,2}\s+(?:Maret|March)\s+\d{4}:\s*NPHR Target', response_text))
        has_unit_sections = bool(re.search(r'^Unit \d+\s*$', response_text, re.MULTILINE))
        
        # NPHR data format as table
        if has_nphr_data:
            return self._format_comparative_response(response_text)
        
        # Unit comparison format with sections
        elif has_unit_sections:
            return self._format_comparison_analysis(response_text)
        
        # Default: minimal formatting to preserve content
        else:
            return self._format_minimal(response_text)
    
    def _format_comparative_response(self, response_text: str) -> str:
        """Format response yang berisi perbandingan data multi-tanggal dengan tabel"""
        
        # Split into sections
        lines = response_text.split('\n')
        formatted_output = []
        date_data = []
        intro_lines = []
        conclusion_lines = []
        
        # Extract date-based data
        date_pattern = r'(\d{1,2}\s+(?:Maret|March|Januari|Februari|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+\d{4}):'
        
        in_date_section = False
        current_date_info = None
        
        for line in lines:
            line_stripped = line.strip()
            
            # Check if this is a date header
            date_match = re.match(date_pattern, line_stripped)
            if date_match:
                # Save previous date data
                if current_date_info:
                    date_data.append(current_date_info)
                
                # Start new date section
                date = date_match.group(1)
                current_date_info = {'date': date, 'data': []}
                in_date_section = True
                
                # Get content after date
                remaining = re.sub(date_pattern, '', line_stripped, count=1).strip()
                if remaining:
                    current_date_info['data'].append(remaining)
            
            elif in_date_section and line_stripped:
                # Check if we're entering conclusion section
                if re.match(r'^(Kesimpulan|Dari data|Tren keseluruhan|Jadi)', line_stripped, re.IGNORECASE):
                    in_date_section = False
                    if current_date_info:
                        date_data.append(current_date_info)
                        current_date_info = None
                    conclusion_lines.append(line_stripped)
                elif current_date_info:
                    current_date_info['data'].append(line_stripped)
            
            elif not in_date_section and line_stripped:
                # Check if conclusion
                if re.search(r'(Kesimpulan|Dari data|Tren|Jadi|berdasarkan)', line_stripped, re.IGNORECASE):
                    conclusion_lines.append(line_stripped)
                elif not date_data:
                    # Intro section before dates
                    intro_lines.append(line_stripped)
                else:
                    # After dates section
                    conclusion_lines.append(line_stripped)
        
        # Save last date if any
        if current_date_info:
            date_data.append(current_date_info)
        
        # Build formatted output
        if date_data:
            # Add title
            formatted_output.append("##  Analisis Data Efisiensi\n")
            
            # Add intro if any
            if intro_lines:
                formatted_output.append(' '.join(intro_lines) + "\n")
            
            formatted_output.append("###  Data Harian\n")
            
            # Try to create structured table
            has_nphr = any('NPHR' in str(d.get('data', [])) for d in date_data)
            has_eta = any('Eta Pro' in str(d.get('data', [])) for d in date_data)
            
            if has_nphr and has_eta:
                # Create detailed table
                formatted_output.append("| Tanggal | NPHR Target | NPHR Achieved | NPHR Loss | Eta Pro Target | Eta Pro Achieved | Eta Pro Loss |")
                formatted_output.append("|---------|-------------|---------------|-----------|----------------|------------------|--------------|")
                
                for date_info in date_data:
                    date = date_info['date']
                    data_lines = date_info['data']
                    
                    # Extract values
                    nphr_target = nphr_achieved = nphr_loss = "-"
                    eta_target = eta_achieved = eta_loss = "-"
                    
                    for line in data_lines:
                        if 'NPHR Target' in line or 'NPHR target' in line:
                            match = re.search(r'(\d+)\s*/\s*(\d+).*?Loss:\s*([\d.]+%)', line)
                            if match:
                                nphr_target = match.group(1)
                                nphr_achieved = match.group(2)
                                nphr_loss = match.group(3)
                        
                        elif 'Eta Pro' in line:
                            match = re.search(r'(\d+)\s*/\s*(\d+).*?Loss:\s*([\d.]+%)', line)
                            if match:
                                eta_target = match.group(1)
                                eta_achieved = match.group(2)
                                eta_loss = match.group(3)
                    
                    formatted_output.append(f"| **{date}** | {nphr_target} | {nphr_achieved} | {nphr_loss} | {eta_target} | {eta_achieved} | {eta_loss} |")
                
                formatted_output.append("")
            else:
                # Simple list format for non-tabular data
                for date_info in date_data:
                    date = date_info['date']
                    data_lines = date_info['data']
                    
                    formatted_output.append(f"** {date}**\n")
                    for data_line in data_lines:
                        formatted_output.append(f"- {data_line}")
                    formatted_output.append("")
            
            # Add conclusion
            if conclusion_lines:
                formatted_output.append("### 💡 Kesimpulan\n")
                formatted_output.append('\n\n'.join(conclusion_lines))
            
            return '\n'.join(formatted_output)
        
        # Fallback if no date structure detected
        return self._format_comparison_analysis(response_text)
    
    def _format_minimal(self, response_text: str) -> str:
        """
        Minimal formatting - just add header and preserve ALL content
        This is the safest formatter that won't cut any content
        """
        
        # Split into paragraphs but preserve everything
        paragraphs = response_text.split('\n\n')
        
        # Add simple header
        output = []
        
        # Add all content as-is
        for para in paragraphs:
            if para.strip():
                output.append(para.strip())
        
        return '\n\n'.join(output)
    
    def _format_comparison_analysis(self, response_text: str) -> str:
        """Format response untuk analisis perbandingan antar unit atau periode"""
        
        formatted_output = []
        
        # Don't over-process - just add structure without cutting content
        lines = response_text.split('\n')
        
        # Add main header
        formatted_output.append("## Analisis Perbandingan\n")
        
        current_section = None
        section_lines = []
        
        for line in lines:
            line_stripped = line.strip()
            if not line_stripped:
                continue
            
            # Detect major section headers
            if re.match(r'^(Unit \d+)$', line_stripped, re.IGNORECASE):
                # Save previous section
                if current_section and section_lines:
                    formatted_output.append(f"###  {current_section}\n")
                    formatted_output.append('\n\n'.join(section_lines) + "\n")
                    section_lines = []
                
                current_section = line_stripped
            
            elif re.match(r'^(Kesimpulan|Conclusion)$', line_stripped, re.IGNORECASE):
                # Save previous section
                if current_section and section_lines:
                    formatted_output.append(f"###  {current_section}\n")
                    formatted_output.append('\n\n'.join(section_lines) + "\n")
                    section_lines = []
                
                current_section = "Kesimpulan"
            
            # Detect date markers within sections
            elif re.match(r'^\d{1,2}\s+(?:Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+\d{4}:', line_stripped):
                date_match = re.match(r'^(\d{1,2}\s+(?:Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+\d{4}):\s*(.*)', line_stripped)
                if date_match:
                    date = date_match.group(1)
                    content = date_match.group(2)
                    section_lines.append(f"**📅 {date}**\n\n{content}")
            
            else:
                # Regular content
                if current_section:
                    section_lines.append(line_stripped)
                else:
                    # Intro paragraph (before any section)
                    formatted_output.append(line_stripped)
        
        # Save last section
        if current_section and section_lines:
            emoji = "" if current_section == "Kesimpulan" else ""
            formatted_output.append(f"\n### {emoji} {current_section}\n")
            formatted_output.append('\n\n'.join(section_lines))
        
        return '\n\n'.join(formatted_output)
    
    def _format_structured_response(self, response_text: str) -> str:
        """Format response umum dengan struktur yang rapi tanpa memotong konten"""
        
        # Simple approach: just add clean structure without aggressive processing
        lines = [line.strip() for line in response_text.split('\n') if line.strip()]
        
        if not lines:
            return response_text
        
        formatted = []
        
        # Just add all content with minimal processing
        current_para = []
        
        for line in lines:
            # Check if it's a clear section break (Kesimpulan, etc)
            if re.match(r'^(Kesimpulan|Conclusion|Jadi|Therefore|Berdasarkan|Based on):', line, re.IGNORECASE):
                # Flush current paragraph
                if current_para:
                    formatted.append(' '.join(current_para) + "\n")
                    current_para = []
                
                # Add conclusion header
                formatted.append(f"### 💡 Kesimpulan\n")
                
                # Add conclusion content
                conclusion_text = re.sub(r'^(Kesimpulan|Conclusion|Jadi|Therefore|Berdasarkan|Based on):\s*', '', line, flags=re.IGNORECASE)
                current_para = [conclusion_text] if conclusion_text else []
            
            else:
                # Regular line - add to current paragraph
                current_para.append(line)
        
        # Flush remaining paragraph
        if current_para:
            formatted.append(' '.join(current_para))
        
        return '\n\n'.join(formatted)
    
    def _format_simple_response(self, response_text: str) -> str:
        """Format simple response dengan paragraf yang rapi"""
        
        lines = response_text.split('\n')
        formatted_lines = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Format bullet points
            if line.startswith(('-', '*', '•', '1.', '2.', '3.')):
                formatted_lines.append(line)
            # Format technical data
            elif ':' in line and any(keyword in line for keyword in ['Target', 'Achieved', 'Loss', 'NPHR', 'Eta']):
                formatted_lines.append(f"- {line}")
            else:
                formatted_lines.append(line)
        
        return '\n\n'.join(formatted_lines)


# Global instance
# Global instance
openai_assistant_service = OpenAIAssistantService() if settings.OPENAI_API_KEY else None

