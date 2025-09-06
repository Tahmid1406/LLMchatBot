from fastapi import FastAPI, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
import tempfile

from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import OllamaEmbeddings
from langchain_community.llms import Ollama
from langchain.chains import ConversationalRetrievalChain
from langchain.memory import ConversationBufferMemory

# -------------------
# FastAPI setup
# -------------------
app = FastAPI()

# Allow CORS (for React frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # set to ["http://localhost:3000"] in dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Persistent storage dir
PERSIST_DIR = "data/chroma/"
os.makedirs(PERSIST_DIR, exist_ok=True)

# Global objects
embeddings = OllamaEmbeddings(model="llama2")
llm = Ollama(model="llama2")
memory = ConversationBufferMemory(memory_key="chat_history", return_messages=True, output_key="answer")

# Build empty retriever (until upload happens)
vectordb = None
retriever = None
qa_chain = None


# -------------------
# Upload Endpoint
# -------------------
@app.post("/upload")
async def upload_pdfs(files: list[UploadFile]):
    global vectordb, retriever, qa_chain, memory

    docs = []
    for file in files:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
            shutil.copyfileobj(file.file, tmp_file)
            tmp_path = tmp_file.name
        loader = PyPDFLoader(tmp_path)
        docs.extend(loader.load())

    # Split into chunks
    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)
    split_docs = splitter.split_documents(docs)

    # Create / update vector DB
    vectordb = Chroma.from_documents(split_docs, embeddings, persist_directory=PERSIST_DIR)
    retriever = vectordb.as_retriever(search_kwargs={"k": 3})

    # Create conversational chain
    qa_chain = ConversationalRetrievalChain.from_llm(
        llm=llm,
        retriever=retriever,
        memory=memory,
        return_source_documents=True,
        output_key="answer"
    )

    return {"message": f"Uploaded {len(files)} PDFs, {len(split_docs)} chunks processed."}


# -------------------
# Chat Endpoint
# -------------------
@app.post("/chat")
async def chat(question: str = Form(...)):
    global qa_chain, retriever, llm

    if qa_chain:  # If PDFs were uploaded
        # Try to retrieve relevant chunks
        docs = retriever.get_relevant_documents(question)

        if not docs or len(docs) == 0:
            # No useful docs → fall back to base LLM
            answer = llm.invoke(question)
            return {"answer": answer, "sources": []}

        # Docs found → use RAG chain
        result = qa_chain({"question": question})
        return {
            "answer": result["answer"],
            "sources": [doc.metadata.get("source", "Unknown") for doc in result.get("source_documents", [])]
        }

    # No PDFs uploaded yet → base LLM
    answer = llm.invoke(question)
    return {"answer": answer, "sources": []}



