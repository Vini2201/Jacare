import fitz
import sys

def main():
    try:
        doc = fitz.open(sys.argv[1])
        text = ""
        for page in doc:
            text += page.get_text()
        print(text[:3000])
    except Exception as e:
        print(f"Error reading PDF: {e}")

if __name__ == "__main__":
    main()
