
const formFields = ["name", "email", "phone", "education", "experience", "skills", "languages"];

function toggleTheme() {
  document.body.classList.toggle("dark");
  const mode = document.body.classList.contains("dark") ? "dark" : "light";
  localStorage.setItem("theme", mode);
}

function loadTheme() {
  const saved = localStorage.getItem("theme");
  if (saved === "dark") document.body.classList.add("dark");
}

function updatePreview() {
  const values = formFields.map(id => document.getElementById(id).value);
  document.getElementById("previewPanel").innerText = `
${values[0]?.toUpperCase()}

Email: ${values[1]}
Phone: ${values[2]}

Education:
${values[3]}

Experience:
${values[4]}

Skills: ${values[5]}
Languages: ${values[6]}
  `.trim();
}

function saveFormData() {
  const data = {};
  formFields.forEach(id => data[id] = document.getElementById(id).value);
  localStorage.setItem("resumeData", JSON.stringify(data));
}

function loadFormData() {
  const saved = JSON.parse(localStorage.getItem("resumeData") || "{}");
  formFields.forEach(id => {
    if (saved[id]) document.getElementById(id).value = saved[id];
  });
}

function clearForm() {
  formFields.forEach(id => document.getElementById(id).value = "");
  localStorage.removeItem("resumeData");
  updatePreview();
}

function bindEvents() {
  formFields.forEach(id => {
    document.getElementById(id).addEventListener("input", () => {
      saveFormData();
      updatePreview();
    });
  });

  document.getElementById("downloadBtn").addEventListener("click", () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const text = document.getElementById("previewPanel").innerText;
    const lines = doc.splitTextToSize(text, 180);
    doc.text(lines, 10, 10);
    doc.save("resume_output.pdf");
  });

  document.querySelector("button[onclick='clearForm()']").addEventListener("click", clearForm);
}

// Parsing Logic
function handleFileUpload(file) {
  const reader = new FileReader();
  if (file.name.endsWith(".pdf")) {
    reader.onload = async function () {
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(reader.result) });
      const pdf = await loadingTask.promise;
      let fullText = "";
      for (let i = 0; i < pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        fullText += content.items.map(item => item.str).join(" ") + "\n";
      }
      parseResumeText(fullText);
    };
    reader.readAsArrayBuffer(file);
  } else if (file.name.endsWith(".docx")) {
    reader.onload = async function () {
      const arrayBuffer = reader.result;
      const zip = await window.docx.Packer.load(arrayBuffer);
      const text = zip.getFullText();
      parseResumeText(text);
    };
    reader.readAsArrayBuffer(file);
  }
}

function parseResumeText(text) {
  document.getElementById("name").value = (text.match(/([A-Z][a-z]+\s[A-Z][a-z]+)/) || [""])[0];
  document.getElementById("email").value = (text.match(/[\w.-]+@[\w.-]+\.\w+/) || [""])[0];
  document.getElementById("phone").value = (text.match(/(\+?\d[\d\s\-]{7,})/) || [""])[0];

  const eduMatch = text.match(/EDUCATION[\s\S]*?(?=(EXPERIENCE|SKILLS|LANGUAGES|$))/i);
  const expMatch = text.match(/(EXPERIENCE|EMPLOYMENT)[\s\S]*?(?=(EDUCATION|SKILLS|LANGUAGES|$))/i);

  document.getElementById("education").value = eduMatch ? eduMatch[0].replace(/EDUCATION/i, "").trim() : "";
  document.getElementById("experience").value = expMatch ? expMatch[0].replace(/(EXPERIENCE|EMPLOYMENT)/i, "").trim() : "";

  updatePreview();
  saveFormData();
}

// Drag and Drop
document.addEventListener("DOMContentLoaded", () => {
  loadTheme();
  loadFormData();
  updatePreview();
  bindEvents();

  const dropZone = document.getElementById("dropZone");
  const fileInput = document.getElementById("resumeInput");

  dropZone.addEventListener("click", () => fileInput.click());
  dropZone.addEventListener("dragover", e => {
    e.preventDefault();
    dropZone.classList.add("bg-gray-200");
  });
  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("bg-gray-200"));
  dropZone.addEventListener("drop", e => {
    e.preventDefault();
    dropZone.classList.remove("bg-gray-200");
    handleFileUpload(e.dataTransfer.files[0]);
  });

  fileInput.addEventListener("change", e => {
    handleFileUpload(e.target.files[0]);
  });
});
