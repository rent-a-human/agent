
export const speak = (text: string) => {
    if (!window.speechSynthesis) return;

    // Cancel existing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    // Attempt to find a female voice (e.g., Google US English, Samantha, Microsoft Zira)
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(v =>
        v.name.includes('Google US English') ||
        v.name.includes('Samantha') ||
        v.name.includes('Zira') ||
        v.name.includes('Female')
    );

    if (femaleVoice) {
        utterance.voice = femaleVoice;
    }

    // Adjust pitch/rate for a "Jarvis-like" feel (or standard assistant)
    utterance.pitch = 1.0;
    utterance.rate = 1.0;

    window.speechSynthesis.speak(utterance);
};
