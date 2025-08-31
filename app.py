import streamlit as st
import tempfile
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import OllamaEmbeddings
from langchain_community.llms import Ollama
from langchain.chains import ConversationalRetrievalChain
from langchain.memory import ConversationBufferMemory

# -------------------
# Streamlit UI
# -------------------
st.set_page_config(page_title="🦙 Chatbot with or without PDFs", page_icon="🤖")
st.title("🦙 End-to-End Chatbot (Local LLaMA2 + Optional PDF Context)")

# Mode selection
mode = st.radio("Choose mode:", ["📚 Chat with PDFs", "💬 Direct Chat"])

# Shared chat history
if "chat_history" not in st.session_state:
    st.session_state.chat_history = []

# Initialize local LLaMA2 model
llm = Ollama(model="llama2")

# =============== MODE 1: DIRECT CHAT =================
if mode == "💬 Direct Chat":
    st.subheader("💬 Direct Chat (no PDFs needed)")

    # Direct LLaMA2 chat
    user_input = st.text_input("You:", key="direct_chat_input")

    if user_input:
        response = llm.invoke(user_input)
        st.session_state.chat_history.append(("You", user_input))
        st.session_state.chat_history.append(("Bot", response))

    # Show conversation
    for role, msg in st.session_state.chat_history:
        st.write(f"**{role}:** {msg}")

# =============== MODE 2: PDF CHAT =================
elif mode == "📚 Chat with PDFs":
    st.subheader("📚 Upload PDFs and Chat")

    uploaded_files = st.file_uploader("Upload up to 10 PDFs", type=["pdf"], accept_multiple_files=True)
    if uploaded_files and len(uploaded_files) > 10:
        st.warning("⚠️ You can upload a maximum of 10 PDFs.")
        uploaded_files = uploaded_files[:10]

    if uploaded_files:
        # 1. Document Loading
        docs = []
        for file in uploaded_files:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
                tmp_file.write(file.read())
                tmp_path = tmp_file.name
            loader = PyPDFLoader(tmp_path)
            docs.extend(loader.load())

        # 2. Splitting
        splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)
        split_docs = splitter.split_documents(docs)

        # 3. Storage with Chroma
        persist_directory = "docs/chroma/"
        embeddings = OllamaEmbeddings(model="llama2")
        vectordb = Chroma.from_documents(split_docs, embeddings, persist_directory=persist_directory)
        retriever = vectordb.as_retriever(search_kwargs={"k": 3})

        # 4. Conversational Retrieval Chain
        memory = ConversationBufferMemory(
            memory_key="chat_history",
            return_messages=True,
            output_key="answer"
        )

        qa_chain = ConversationalRetrievalChain.from_llm(
            llm=llm,
            retriever=retriever,
            memory=memory,
            return_source_documents=True,
            output_key="answer"
        )

        # 5. Chat UI
        user_input = st.text_input("Ask something about your PDFs:", key="pdf_chat_input")

        if user_input:
            result = qa_chain({"question": user_input})
            st.session_state.chat_history.append(("You", user_input))
            st.session_state.chat_history.append(("Bot", result["answer"]))

            # Display conversation
            for role, msg in st.session_state.chat_history:
                st.write(f"**{role}:** {msg}")

            # Show sources
            with st.expander("🔍 Retrieved Context"):
                for doc in result.get("source_documents", []):
                    source = doc.metadata.get("source", "Unknown file")
                    st.write(f"**{source}**")
                    st.write(doc.page_content[:200] + "...")
    else:
        st.info("👆 Upload PDFs to enable retrieval-augmented chat.")
