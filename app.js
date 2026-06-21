// Dastur yuklanganda xotiradan ma'lumotlarni o'qish
document.addEventListener("DOMContentLoaded", () => {
    displayWords();
    // Ovozlar ro'yxatini brauzer xotirasiga oldindan yuklash
    window.speechSynthesis.getVoices();
});

let words = JSON.parse(localStorage.getItem("words")) || [];
let isPlaying = false;
let currentPlaylistIndex = 0;

// Ovozlar yuklanganda qayta ishlash hodisasi
if (typeof speechSynthesis !== 'undefined' && speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
    };
}

// 1. Nemischa ovozni majburiy va aniq qidirish mantiqi
function getBestVoice(lang) {
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    // To'liq moslikni tekshirish (masalan, de-DE)
    let exactMatch = voices.find(v => v.lang.toLowerCase() === lang.toLowerCase());
    if (exactMatch) return exactMatch;

    // Til boshlanishini tekshirish (masalan, 'de' bilan boshlangan har qanday ovoz)
    let langMatch = voices.find(v => v.lang.toLowerCase().startsWith(lang.substring(0, 2)));
    if (langMatch) return langMatch;

    // O'zbek tili yo'q bo'lsa, turkcha yoki universal ovozga yo'naltirish
    if (lang.startsWith('uz')) {
        return voices.find(v => v.lang.toLowerCase().startsWith('tr')) || null;
    }

    return null;
}

// 2. MyMemory API orqali avtomatik tarjima qilish
async function translateWord() {
    const germanText = document.getElementById("germanWord").value.trim();
    const uzbekInput = document.getElementById("uzbekWord");

    if (germanText === "") {
        alert("Iltimos, oldin nemischa so'zni yozing!");
        return;
    }

    const translateBtn = document.querySelector(".translate-btn");
    translateBtn.innerText = "🔄 Tarjima qilinmoqda...";
    translateBtn.disabled = true;

    try {
        const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(germanText)}&langpair=de|uz`);
        const data = await response.json();

        if (data.responseData && data.responseData.translatedText) {
            let translated = data.responseData.translatedText;
            
            if (translated.toLowerCase() === germanText.toLowerCase()) {
                uzbekInput.value = "";
                alert("O'zbekcha tarjima topilmadi, iltimos o'zingiz yozing.");
            } else {
                uzbekInput.value = translated;
            }
        }
    } catch (error) {
        console.error("Xatolik:", error);
        alert("Tarjima xizmatiga ulanib bo'lmadi. Internetni tekshiring.");
    } finally {
        translateBtn.innerText = "⚡ Avto-Tarjima";
        translateBtn.disabled = false;
    }
}

// 3. Lug'atga so'z qo'shish
function addWord() {
    const german = document.getElementById("germanWord").value.trim();
    const uzbek = document.getElementById("uzbekWord").value.trim();
    const categorySelect = document.getElementById("categorySelect");
    const category = categorySelect ? categorySelect.value : "Kundalik";

    if (german === "" || uzbek === "") {
        alert("Iltimos, so'zlarni to'ldiring!");
        return;
    }

    const newWord = { 
        id: Date.now(), 
        german, 
        uzbek, 
        category: category === "all" ? "Kundalik" : category 
    };
    
    words.push(newWord);
    localStorage.setItem("words", JSON.stringify(words));
    
    document.getElementById("germanWord").value = "";
    document.getElementById("uzbekWord").value = "";

    displayWords();
}

// 4. Ro'yxatni ekranda ko'rsatish
function displayWords() {
    const wordList = document.getElementById("wordList");
    const selectedCategory = document.getElementById("categorySelect").value;
    wordList.innerHTML = "";

    const filteredWords = words.filter(w => selectedCategory === "all" || w.category === selectedCategory);

    filteredWords.forEach(word => {
        const li = document.createElement("li");
        li.innerHTML = `
            <span><strong>${word.german}</strong> - ${word.uzbek} <small style="color:gray">(${word.category})</small></span>
            <div>
                <button onclick="speakAlone('${word.german}', 'de-DE')">DE 🔊</button>
                <button onclick="speakAlone('${word.uzbek}', 'uz-UZ')">UZ 🔊</button>
                <button onclick="deleteWord(${word.id})" class="delete-btn">❌</button>
            </div>
        `;
        wordList.appendChild(li);
    });
}

function filterWords() {
    displayWords();
}

// 5. Alohida eshitish funksiyasi
function speakAlone(text, lang) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    const voice = getBestVoice(lang);
    if (voice) utterance.voice = voice;
    utterance.lang = lang;
    
    window.speechSynthesis.speak(utterance);
}

// 6. Avto-takrorlash va Playlist mantiqi
async function startPlaylist() {
    const selectedCategory = document.getElementById("categorySelect").value;
    const playlist = words.filter(w => selectedCategory === "all" || w.category === selectedCategory);

    if (playlist.length === 0) {
        alert("Playlistda so'zlar mavjud emas!");
        return;
    }

    isPlaying = true;
    currentPlaylistIndex = 0;
    
    while (isPlaying && currentPlaylistIndex < playlist.length) {
        let currentWord = playlist[currentPlaylistIndex];
        document.getElementById("nowPlaying").innerText = `🎧 O'qilmoqda: ${currentWord.german}`;

        // Nemischa o'qish
        await speakTimeout(currentWord.german, 'de-DE');
        
        // Miyada tarjimani o'ylash uchun 1.5 soniya kutish vaqti
        await new Promise(resolve => setTimeout(resolve, 1500)); 

        if (!isPlaying) break;

        // O'zbekcha o'qish
        await speakTimeout(currentWord.uzbek, 'uz-UZ');

        // Keyingi so'zga o'tish oldidan 2 soniya tanaffus
        await new Promise(resolve => setTimeout(resolve, 2000)); 
        
        currentPlaylistIndex++;
    }

    if (isPlaying) {
        document.getElementById("nowPlaying").innerText = "🎉 Playlist tugadi!";
        isPlaying = false;
    }
}

// Playlist qotib qolmasligi uchun vaqt bilan chegaralangan eshitish funksiyasi
function speakTimeout(text, lang) {
    return new Promise((resolve) => {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        
        const voice = getBestVoice(lang);
        if (voice) utterance.voice = voice;
        utterance.lang = lang;

        // Har qanday holatda ham 3.5 soniyadan keyin keyingi so'zga o'tish kafolati
        const backupTimeout = setTimeout(() => {
            resolve();
        }, 3500);

        utterance.onend = () => {
            clearTimeout(backupTimeout);
            resolve();
        };
        
        utterance.onerror = () => {
            clearTimeout(backupTimeout);
            resolve();
        };
        
        window.speechSynthesis.speak(utterance);
    });
}

// Playlistni to'xtatish
function stopPlaylist() {
    isPlaying = false;
    window.speechSynthesis.cancel();
    document.getElementById("nowPlaying").innerText = "⏸️ Playlist to'xtatildi.";
}

// So'zni o'chirish
function deleteWord(id) {
    words = words.filter(word => word.id !== id);
    localStorage.setItem("words", JSON.stringify(words));
    displayWords();
}