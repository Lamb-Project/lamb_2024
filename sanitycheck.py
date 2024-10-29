import sqlite3
import sys

# Define the expected table and field names
expected_tables = ['collections', 'sqlite_sequence', 'presets', 'models', 'users']
expected_fields = {
    'collections': ['id', 'collection', 'embeddingFunction'],
    'sqlite_sequence': ['name', 'seq'],
    'presets': ['modelId', 'vectorDB', 'collection', 'embedding', 'promptTemplate', 'systemPrompt', 'topK', 'augmentation', 'llm', 'apiKey'],
    'models': ['id', 'object', 'created', 'type', 'max_tokens', 'owner', 'permissions'],
    'users': ['id', 'name', 'password']
}

def check_database(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Get the list of tables in the database
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [row[0] for row in cursor.fetchall()]

    # Check if the tables are the same
    if set(tables) != set(expected_tables):
        print("Tables do not match")
        print("Expected tables:", expected_tables)
        print("Actual tables:", tables)
        return

    # Check each table's fields
    for table in expected_tables:
        cursor.execute(f"PRAGMA table_info({table});")
        fields = [row[1] for row in cursor.fetchall()]

        if set(fields) != set(expected_fields[table]):
            print(f"Fields in table {table} do not match")
            print("Expected fields:", expected_fields[table])
            print("Actual fields:", fields)
            return

    print("Database schema matches expected schema")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python script.py <db_file>")
        sys.exit(1)

    db_path = sys.argv[1]
    check_database(db_path)

