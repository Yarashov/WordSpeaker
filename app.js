// Sahifa yuklanganda saqlangan so'zlarni ko'rsatish
document.addEventListener("DOMContentLoaded", displayWords);

// 2-Bosqich: Ma'lumotlarni brauzer xotirasida (localStorage) saqlash
let words = JSON.parse(localStorage.getItem("words")) || [];

// 3-Bosqich: So'z qo'shish funksiyasi
function addWord() {
    const german = document.getElementById("germanWord").value.trim();
    const uzbek = document.getElementById("uzbekWord").value.trim();

    if (german === "" || uzbek === "") {
        alert("Iltimos, har ikkala maydonni ham to'ldiring!");
        return;
    }

    const newWord = { id: Date.now(), german, uzbek };
    words.push(newWord);
    
    // Xotiraga saqlash
    localStorage.setItem("words", JSON.stringify(words));
    
    // Inputlarni tozalash
    document.getElementById("germanWord").value = "";
    document.getElementById("uzbekWord").value = "";

    displayWords();
}

// Ro'yxatni ekranda ko'rsatish
function displayWords() {
    const wordList = document.getElementById("wordList");
    wordList.innerHTML = "";

    words.forEach(word => {
        const li = document.createElement("li");
        li.innerHTML = `
            <span><strong>${word.german}</strong> - ${word.uzbek}</span>
            <div>
                <button onclick="speak('${word.german}')">🔊 Tinglash</button>
                <button onclick="deleteWord(${word.id})" class="delete-btn">❌</button>
            </div>
        `;
        wordList.appendChild(li);
    });
}

// 6-Bosqich: Web Text-to-Speech (Gapirish algoritmi)
function speak(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'de-DE'; // Nemis tili talaffuzi
    window.speechSynthesis.speak(utterance);
}

// So'zni o'chirish
function deleteWord(id) {
    words = words.filter(word => word.id !== id);
    localStorage.setItem("words", JSON.stringify(words));
    displayWords();
}