const formFields = ["name", "email", "phone", "education", "experience", "skills", "languages"];
const translations = {
  en: {
    nameLabel: "Name",
    emailLabel: "Email",
    phoneLabel: "Phone",
    educationLabel: "Education",
    experienceLabel: "Experience",
    skillsLabel: "Skills",
    languagesLabel: "Languages",
    dropZoneText: "Drag and drop your resume here or click to upload"
  },
  hi: {
    nameLabel: "नाम",
    emailLabel: "ईमेल",
    phoneLabel: "फोन",
    educationLabel: "शिक्षा",
    experienceLabel: "अनुभव",
    skillsLabel: "कौशल",
    languagesLabel: "भाषाएँ",
    dropZoneText: "अपना रिज्यूमे यहाँ ड्रैग और ड्रॉप करें या अपलोड करने के लिए क्लिक करें"
  }
};

function toggleTheme() {
  document.body.classList.toggle("dark");
  localStorage.setItem("theme", document.body.classList.contains("dark") ? "dark" : "light");
}

function loadTheme() {
  if (localStorage.getItem("theme") === "dark") document.body.classList.add("dark");
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

Skills:
${values[5].split(",").map(s => `• ${s.trim()}`).join("\n")}

Languages:
${values[6].split(",").map(l => `• ${l.trim()}`).join("\n")}
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
    if (saved[id]) {
      document.getElementById(id).value = saved[id];
      if (id === "skills") updateSkillInputs(saved[id]);
      if (id === "languages") updateLanguageInputs(saved[id]);
    }
  });
}

function saveProfile() {
  saveFormData();
  alert("Profile saved successfully!");
}

function clearForm() {
  formFields.forEach(id => document.getElementById(id).value = "");
  document.getElementById("skillsList").innerHTML = "";
  document.getElementById("languagesList").innerHTML = "";
  addSkillInput();
  addLanguageInput();
  localStorage.removeItem("resumeData");
  updatePreview();
}

function addSkillInput(value = "") {
  const input = document.createElement("input");
  input.type = "text";
  input.className = "w-full p-2 border";
  input.placeholder = "Add skill...";
  input.value = value;
  input.addEventListener("input", updateSkills);
  document.getElementById("skillsList").appendChild(input);
}

function addLanguageInput(value = "") {
  const input = document.createElement("input");
  input.type = "text";
  input.className = "w-full p-2 border";
  input.placeholder = "Add language...";
  input.value = value;
  input.addEventListener("input", updateLanguages);
  document.getElementById("languagesList").appendChild(input);
}

function updateSkills() {
  const skills = Array.from(document.getElementById("skillsList").querySelectorAll("input"))
    .map(i => i.value)
    .filter(v => v)
    .join(",");
  document.getElementById("skills").value = skills;
  saveFormData();
  updatePreview();
}

function updateLanguages() {
  const languages = Array.from(document.getElementById("languagesList").querySelectorAll("input"))
    .map(i => i.value)
    .filter(v => v)
    .join(",");
  document.getElementById("languages").value = languages;
  saveFormData();
  updatePreview();
}

function updateSkillInputs(skills) {
  document.getElementById("skillsList").innerHTML = "";
  skills.split(",").filter(s => s.trim()).forEach(s => addSkillInput(s.trim()));
}

function updateLanguageInputs(languages) {
  document.getElementById("languagesList").innerHTML = "";
  languages.split(",").filter(l => l.trim()).forEach(l => addLanguageInput(l.trim()));
}

function debounce(fn, ms) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), ms);
  };
}

function applyStyle(style) {
  const panel = document.getElementById("previewPanel");
  panel.classList.remove("minimal", "modern", "professional");
  panel.classList.add(style);
  localStorage.setItem("style", style);
}

function loadStyle() {
  const style = localStorage.getItem("style") || "minimal";
  document.getElementById("styleSelector").value = style;
  applyStyle(style);
}

function updateLanguage(lang) {
  Object.keys(translations[lang]).forEach(id => {
    document.getElementById(id).innerText = translations[lang][id];
  });
  localStorage.setItem("language", lang);
}

function loadLanguage() {
  const lang = localStorage.getItem("language") || "en";
  document.getElementById("languageSelector").value = lang;
  updateLanguage(lang);
}

function bindEvents() {
  formFields.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener("input", debounce(() => {
        saveFormData();
        updatePreview();
      }, 300));
    }
  });

  document.getElementById("downloadBtn").addEventListener("click", () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Resume", 10, 10);
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    const text = document.getElementById("previewPanel").innerText;
    const lines = doc.splitTextToSize(text, 180);
    doc.text(lines, 10, 20);
    doc.save("resume_output.pdf");
  });

  document.getElementById("languageSelector").addEventListener("change", e => updateLanguage(e.target.value));
  document.getElementById("styleSelector").addEventListener("change", e => applyStyle(e.target.value));
}

// Parsing Logic
async function handleFileUpload(file) {
  const dropZone = document.getElementById("dropZone");
  const status = document.getElementById("uploadStatus");
  status.innerHTML = `<div class="spinner"></div>`;
  dropZone.querySelector("p").innerText = `Processing ${file.name}...`;

  try {
    const reader = new FileReader();
    reader.onload = async function () {
      if (file.name.endsWith(".pdf")) {
        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(reader.result) });
        const pdf = await loadingTask.promise;
        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          fullText += content.items.map(item => item.str).join(" ") + "\n";
        }
        parseResumeText(fullText);
      } else if (file.name.endsWith(".docx")) {
        const arrayBuffer = reader.result;
        const zip = new JSZip();
        const content = await zip.loadAsync(arrayBuffer);
        const xml = await content.file("word/document.xml").async("string");
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, "application/xml");
        const text = Array.from(doc.getElementsByTagName("w:t")).map(t => t.textContent).join(" ");
        parseResumeText(text);
      }
      status.innerHTML = `<p class="text-green-600">File processed successfully!</p>`;
      dropZone.querySelector("p").innerText = translations[localStorage.getItem("language") || "en"].dropZoneText;
    };
    reader.onerror = () => {
      throw new Error("Failed to read file.");
    };
    reader.readAsArrayBuffer(file);
  } catch (error) {
    status.innerHTML = `<p class="text-red-600">Error: Failed to process ${file.name}. Try another file.</p>`;
    dropZone.querySelector("p").innerText = translations[localStorage.getItem("language") || "en"].dropZoneText;
  }
}

function parseResumeText(text) {
  document.getElementById("name").value = (text.match(/([A-Z][a-z]+(?:[- ][A-Z][a-z]+)*)/) || [""])[0];
  document.getElementById("email").value = (text.match(/[\w.-]+@[\w.-]+\.\w+/) || [""])[0];
  document.getElementById("phone").value = (text.match(/\+?\d{1,3}[\s\-]?\d{3}[\s\-]?\d{3}[\s\-]?\d{4}/) || [""])[0];

  const eduMatch = text.match(/(EDUCATION|ACADEMIC BACKGROUND|QUALIFICATIONS)[\s\S]*?(?=(EXPERIENCE|SKILLS|LANGUAGES|EMPLOYMENT|WORK HISTORY|$))/i);
  const expMatch = text.match(/(EXPERIENCE|EMPLOYMENT|WORK HISTORY)[\s\S]*?(?=(EDUCATION|SKILLS|LANGUAGES|$))/i);
  const skillsMatch = text.match(/(SKILLS|TECHNICAL SKILLS)[\s\S]*?(?=(EDUCATION|EXPERIENCE|LANGUAGES|$))/i);
  const langMatch = text.match(/(LANGUAGES)[\s\S]*?(?=(EDUCATION|EXPERIENCE|SKILLS|$))/i);

  document.getElementById("education").value = eduMatch ? eduMatch[0].replace(/(EDUCATION|ACADEMIC BACKGROUND|QUALIFICATIONS)/i, "").trim() : "";
  document.getElementById("experience").value = expMatch ? expMatch[0].replace(/(EXPERIENCE|EMPLOYMENT|WORK HISTORY)/i, "").trim() : "";

  const skills = skillsMatch ? skillsMatch[0].replace(/(SKILLS|TECHNICAL SKILLS)/i, "").trim().split(/[,;\n]/).filter(s => s.trim()) : [];
  document.getElementById("skills").value = skills.join(",");
  updateSkillInputs(skills.join(","));

  const languages = langMatch ? langMatch[0].replace(/LANGUAGES/i, "").trim().split(/[,;\n]/).filter(l => l.trim()) : [];
  document.getElementById("languages").value = languages.join(",");
  updateLanguageInputs(languages.join(","));

  updatePreview();
  saveFormData();
}

// Drag and Drop
document.addEventListener("DOMContentLoaded", () => {
  loadTheme();
  loadLanguage();
  loadStyle();
  loadFormData();
  addSkillInput();
  addLanguageInput();
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