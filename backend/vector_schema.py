from openai import OpenAI
import chromadb
from sqlalchemy import create_engine, inspect

# === OpenAI + Chroma Setup ===
openai_client = OpenAI()  # Requires OPENAI_API_KEY in env
chroma_client = chromadb.PersistentClient(path=".chromadb")
collection = chroma_client.get_or_create_collection(name="schema_info")
EMBEDDING_MODEL = "text-embedding-ada-002"

# === SQLAlchemy Connection Setup ===
SERVER = 'poc-dataengg.database.windows.net'
DATABASE = 'POC'
USERNAME = 'powerbi_user'
PASSWORD = '5QvVkCM1b17U6wa'
DRIVER = 'ODBC Driver 18 for SQL Server'  # Make sure it's installed

connection_url = f"mssql+pyodbc://{USERNAME}:{PASSWORD}@{SERVER}/{DATABASE}?driver={DRIVER.replace(' ', '+')}"
engine = create_engine(connection_url)


# === Step 1: Store Schema Info in Vector DB ===
def initialize_vector_store():
    inspector = inspect(engine)
    tables = inspector.get_table_names(schema='dbo')

    for idx, table_name in enumerate(tables):
        columns_info = inspector.get_columns(table_name, schema='dbo')
        columns = ", ".join(col['name'] for col in columns_info)

        full_text = f"Database: {DATABASE}, Table: {table_name}, Columns: {columns}"

        embedding = openai_client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=full_text
        ).data[0].embedding

        collection.add(
            ids=[f"schema_{idx}"],
            documents=[full_text],
            embeddings=[embedding],
            metadatas=[{"db": DATABASE, "table": table_name, "columns": columns}]
        )

        print(f"✅ Added to Chroma: {full_text}")

    # Add a document listing all table names
    all_tables_text = f"Database: {DATABASE}, All Tables: {', '.join(tables)}"
    embedding = openai_client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=all_tables_text
    ).data[0].embedding
    collection.add(
        ids=["schema_all_tables"],
        documents=[all_tables_text],
        embeddings=[embedding],
        metadatas=[{"db": DATABASE, "table": "all tables", "columns": ', '.join(tables)}]
    )
    print(f"✅✅ Vector DB initialized successfully.")


# === Step 2: Fetch Schema Info for Query ===
def get_schema_info_from_vector(user_query: str) -> str:
    embedding = openai_client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=user_query
    ).data[0].embedding

    results = collection.query(query_embeddings=[embedding], n_results=3)
    documents = results.get("documents", [[]])[0]
    if not documents:
        return "⚠️ No schema info found for your query."

    print(f"🔍 Top matched schema docs: {documents}")
    return "\n".join(documents)


# === Optional ===
# initialize_vector_store()  # Call once to populate Chroma from SQL Server