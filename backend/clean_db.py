import psycopg2

conn = psycopg2.connect('postgresql://postgres:postgres@localhost:5432/vectorchat')
cur = conn.cursor()

# Clean document-related tables with correct names
try:
    cur.execute("DELETE FROM document_chunks")
    print("Cleaned document_chunks")
except Exception as e:
    print("document_chunks:", e)

try:
    cur.execute("DELETE FROM history_upload") 
    print("Cleaned history_upload")
except Exception as e:
    print("history_upload:", e)

try:
    cur.execute("DELETE FROM history_chat")
    print("Cleaned history_chat")
except Exception as e:
    print("history_chat:", e)

try:
    cur.execute("DELETE FROM documents")
    print("Cleaned documents")
except Exception as e:
    print("documents:", e)

conn.commit()
conn.close()
print("Database cleanup completed")