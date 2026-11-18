/* ==============================================================================
   منصة بصيرة التعليمية للذكاء الاصطناعي (Baseera AI Educational Platform)
   Universal Accessibility & Audio Engine (TTS, STT, Braille, WCAG AAA)
   Supervisor: المهندس محمد عاطف
   ============================================================================== */

const Accessibility = {
  ttsRate: 1.0,
  ttsPitch: 1.0,
  synth: window.speechSynthesis,
  currentUtterance: null,
  isReadingRulerActive: false,
  fontScale: 100,
  isRecognitionActive: false,
  recognition: null,

  // Arabic Braille Character Mapping (Grade 1 Standard)
  brailleMap: {
    'ا': '⠁', 'أ': '⠁', 'إ': '⠊', 'آ': '⠜', 'ء': '⠄',
    'ب': '⠃', 'ت': '⠞', 'ث': '⠹', 'ج': '⠚', 'ح': '⠱',
    'خ': '⠭', 'د': '⠙', 'ذ': '⠮', 'ر': '⠗', 'ز': '⠵',
    'س': '⠎', 'ش': '⠩', 'ص': '⠯', 'ض': '⠫', 'ط': '⠾',
    'ظ': '⠿', 'ع': '⠉', 'غ': '⠣', 'ف': '⠋', 'ق': '⠟',
    'ك': '⠅', 'ل': '⠇', 'م': '⠍', 'ن': '⠝', 'ه': '⠓',
    'و': '⠺', 'ي': '⠽', 'ى': '⠕', 'ة': '⠡', 'ئ': '⠽',
    'ؤ': '⠳', ' ': ' ', '.': '⠲', ',': '⠂', '،': '⠂',
    '؟': '⠦', '?': '⠦', '!': '⠖', ':': '⠒', '-': '⠤',
    '1': '⠼⠁', '2': '⠼⠃', '3': '⠼⠉', '4': '⠼⠙', '5': '⠼⠑',
    '6': '⠼⠋', '7': '⠼⠛', '8': '⠼⠓', '9': '⠼⠊', '0': '⠼⠚'
  },

  init() {
    this.loadSavedPreferences();
    this.setupKeyboardShortcuts();
    this.setupReadingRuler();
    this.setupSpeechRecognition();
    this.setupAnnouncer();
  },

  // -------------------------------------------------------------
  // Screen Reader Live Announcements (WCAG AAA ARIA Live)
  // -------------------------------------------------------------
  setupAnnouncer() {
    if (!document.getElementById('sr-announcer')) {
      const announcer = document.createElement('div');
      announcer.id = 'sr-announcer';
      announcer.className = 'sr-only';
      announcer.setAttribute('aria-live', 'polite');
      announcer.setAttribute('aria-atomic', 'true');
      document.body.appendChild(announcer);
    }
  },

  announce(text, isAssertive = false) {
    const announcer = document.getElementById('sr-announcer');
    if (announcer) {
      announcer.setAttribute('aria-live', isAssertive ? 'assertive' : 'polite');
      announcer.textContent = '';
      setTimeout(() => {
        announcer.textContent = text;
      }, 50);
    }
  },

  // -------------------------------------------------------------
  // Text-to-Speech (TTS) Engine
  // -------------------------------------------------------------
  speak(text, onEnd = null) {
    if (!this.synth) {
      console.warn('Speech synthesis not supported in this browser.');
      return;
    }

    this.stopSpeech();

    const cleanText = text.replace(/<[^>]*>/g, '').trim();
    if (!cleanText) return;

    this.currentUtterance = new SpeechSynthesisUtterance(cleanText);
    this.currentUtterance.rate = this.ttsRate;
    this.currentUtterance.pitch = this.ttsPitch;
    this.currentUtterance.lang = 'ar-SA';

    // Locate best Arabic voice
    const voices = this.synth.getVoices();
    const arVoice = voices.find(v => v.lang.startsWith('ar') || v.name.includes('Arabic') || v.name.includes('Maged') || v.name.includes('Laila') || v.name.includes('Tarik'));
    if (arVoice) {
      this.currentUtterance.voice = arVoice;
    }

    this.currentUtterance.onend = () => {
      this.currentUtterance = null;
      if (onEnd) onEnd();
    };

    this.currentUtterance.onerror = (e) => {
      console.error('Speech synthesis error:', e);
      this.currentUtterance = null;
      if (onEnd) onEnd();
    };

    this.synth.speak(this.currentUtterance);
  },

  stopSpeech() {
    if (this.synth && this.synth.speaking) {
      this.synth.cancel();
      this.currentUtterance = null;
    }
  },

  pauseResumeSpeech() {
    if (!this.synth) return;
    if (this.synth.paused) {
      this.synth.resume();
      this.announce('تم استئناف القراءة الصوتية');
    } else if (this.synth.speaking) {
      this.synth.pause();
      this.announce('تم إيقاف القراءة الصوتية مؤقتاً');
    }
  },

  setSpeed(speedVal) {
    this.ttsRate = parseFloat(speedVal) || 1.0;
    this.announce(`تم ضبط سرعة القراءة الصوتية على ${this.ttsRate} ضعف`);
    localStorage.setItem('baseera_tts_speed', this.ttsRate);
  },

  // -------------------------------------------------------------
  // Speech Recognition (STT) & Voice Navigation
  // -------------------------------------------------------------
  setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech Recognition not supported in this browser.');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'ar-SA';
    this.recognition.continuous = false;
    this.recognition.interimResults = false;

    this.recognition.onstart = () => {
      this.isRecognitionActive = true;
      this.announce('تم تشغيل الميكروفون، تفضل بالتحدث الآن بالأمر الصوتي.');
      const micBtn = document.getElementById('global-mic-btn');
      if (micBtn) micBtn.classList.add('active');
    };

    this.recognition.onend = () => {
      this.isRecognitionActive = false;
      const micBtn = document.getElementById('global-mic-btn');
      if (micBtn) micBtn.classList.remove('active');
    };

    this.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.trim().toLowerCase();
      console.log('Voice Command Received:', transcript);
      this.handleVoiceCommand(transcript);
    };

    this.recognition.onerror = (event) => {
      console.warn('Recognition error:', event.error);
      this.announce('عذراً، لم أتمكن من تمييز الصوت، يرجى المحاولة مرة أخرى.');
    };
  },

  toggleVoiceRecognition() {
    if (!this.recognition) {
      alert('ميزة التعرف على الصوت غير مدعومة في هذا المتصفح. نوصي باستخدام متصفح حديث مثل جوجل كروم أو إيدج.');
      return;
    }

    if (this.isRecognitionActive) {
      this.recognition.stop();
    } else {
      try {
        this.recognition.start();
      } catch (e) {
        console.warn('Recognition start error:', e);
      }
    }
  },

  handleVoiceCommand(cmd) {
    this.announce(`الأمر الصوتي: ${cmd}`);

    if (cmd.includes('رئيسي') || cmd.includes('البداية') || cmd.includes('الصفحة الأولى')) {
      if (window.App) window.App.navigate('home');
      this.speak('انتقلنا إلى الصفحة الرئيسية لمنصة بصيرة');
    } else if (cmd.includes('فصول') || cmd.includes('الدروس') || cmd.includes('الوحدات') || cmd.includes('الذكاء')) {
      if (window.App) window.App.navigate('about-ai');
      this.speak('انتقلنا إلى فصول الذكاء الاصطناعي التسعة');
    } else if (cmd.includes('تكنولوجيا') || cmd.includes('التعليم')) {
      if (window.App) window.App.navigate('edtech');
      this.speak('انتقلنا إلى قسم تكنولوجيا التعليم والتحول الرقمي');
    } else if (cmd.includes('أدوات') || cmd.includes('مكتبة')) {
      if (window.App) window.App.navigate('tools');
      this.speak('انتقلنا إلى مكتبة أدوات الذكاء الاصطناعي');
    } else if (cmd.includes('اختبار') || cmd.includes('امتحان') || cmd.includes('تقييم')) {
      if (window.App) window.App.navigate('quizzes');
      this.speak('انتقلنا إلى قسم الاختبارات والتقييم الذاتي');
    } else if (cmd.includes('لوحة') || cmd.includes('طالب') || cmd.includes('شهادة')) {
      if (window.App) window.App.navigate('dashboard');
      this.speak('انتقلنا إلى لوحة تحكم الطالب والشهادات المعتمدة');
    } else if (cmd.includes('نقاش') || cmd.includes('مجتمع') || cmd.includes('غرفة')) {
      if (window.App) window.App.navigate('discussions');
      this.speak('انتقلنا إلى غرف النقاش المجتمعية والمشرف');
    } else if (cmd.includes('إمكانية الوصول') || cmd.includes('وصول') || cmd.includes('مختبر')) {
      if (window.App) window.App.navigate('accessibility-center');
      this.speak('انتقلنا إلى مركز إمكانية الوصول والأدوات المتخصصة');
    } else if (cmd.includes('اتصل') || cmd.includes('مشرف') || cmd.includes('دعم')) {
      if (window.App) window.App.navigate('contact');
      this.speak('انتقلنا إلى صفحة اتصل بنا وبيانات المهندس محمد عاطف');
    } else if (cmd.includes('مسطرة')) {
      this.toggleReadingRuler();
    } else if (cmd.includes('توقف') || cmd.includes('اسكت') || cmd.includes('كتم')) {
      this.stopSpeech();
    } else if (cmd.includes('مظلم') || cmd.includes('ليلي')) {
      this.setTheme('dark');
    } else if (cmd.includes('فاتح') || cmd.includes('نهاري')) {
      this.setTheme('light');
    } else if (cmd.includes('عالي التباين') || cmd.includes('تباين')) {
      this.setTheme('high-contrast');
    } else {
      this.speak(`عذراً، لم أتعرف على الأمر "${cmd}". يمكنك قول: الرئيسية، الفصول، الاختبارات، لوحة الطالب، أو مسطرة القراءة.`);
    }
  },

  // -------------------------------------------------------------
  // Themes: Light, Dark, WCAG AAA High-Contrast
  // -------------------------------------------------------------
  setTheme(theme) {
    document.body.classList.remove('theme-dark', 'theme-high-contrast');
    document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));

    if (theme === 'dark') {
      document.body.classList.add('theme-dark');
      const btn = document.getElementById('btn-theme-dark');
      if (btn) btn.classList.add('active');
      this.announce('تم تفعيل الوضع الليلي الداكن.');
    } else if (theme === 'high-contrast') {
      document.body.classList.add('theme-high-contrast');
      const btn = document.getElementById('btn-theme-hc');
      if (btn) btn.classList.add('active');
      this.announce('تم تفعيل وضع التباين العالي الفائق WCAG AAA للمكفوفين وضعاف البصر.');
    } else {
      const btn = document.getElementById('btn-theme-light');
      if (btn) btn.classList.add('active');
      this.announce('تم تفعيل الوضع الفاتح الافتراضي.');
    }

    localStorage.setItem('baseera_theme', theme);
  },

  // -------------------------------------------------------------
  // Font Resizing (90% - 160%) & Dyslexia Mode
  // -------------------------------------------------------------
  changeFontSize(step) {
    let nextScale = this.fontScale + step;
    if (nextScale > 160) nextScale = 160;
    if (nextScale < 90) nextScale = 90;
    this.fontScale = nextScale;
    document.documentElement.style.setProperty('--font-base-scale', `${this.fontScale}%`);
    this.announce(`تم تغيير حجم الخط إلى ${this.fontScale} بالمائة`);
    localStorage.setItem('baseera_font_scale', this.fontScale);
  },

  resetFontSize() {
    this.fontScale = 100;
    document.documentElement.style.setProperty('--font-base-scale', `100%`);
    this.announce('تمت استعادة حجم الخط الافتراضي 100%');
    localStorage.setItem('baseera_font_scale', 100);
  },

  toggleDyslexiaFont() {
    const isDyslexic = document.body.classList.toggle('font-dyslexia');
    const btn = document.getElementById('btn-dyslexia');
    if (btn) btn.classList.toggle('active', isDyslexic);
    this.announce(isDyslexic ? 'تم تفعيل خط القراءة الميسر لصعوبات التعلم' : 'تم تفعيل الخط القياسي');
    localStorage.setItem('baseera_dyslexia', isDyslexic ? '1' : '0');
  },

  // -------------------------------------------------------------
  // Visual Reading Guide Ruler
  // -------------------------------------------------------------
  setupReadingRuler() {
    const ruler = document.getElementById('reading-ruler');
    if (!ruler) return;

    window.addEventListener('mousemove', (e) => {
      if (this.isReadingRulerActive) {
        ruler.style.top = `${e.clientY - 19}px`;
      }
    });

    window.addEventListener('keydown', (e) => {
      if (this.isReadingRulerActive) {
        let currentTop = parseInt(ruler.style.top || '100', 10);
        if (e.key === 'ArrowDown') {
          ruler.style.top = `${currentTop + 25}px`;
        } else if (e.key === 'ArrowUp') {
          ruler.style.top = `${Math.max(0, currentTop - 25)}px`;
        }
      }
    });
  },

  toggleReadingRuler() {
    const ruler = document.getElementById('reading-ruler');
    const btn = document.getElementById('btn-ruler');
    this.isReadingRulerActive = !this.isReadingRulerActive;

    if (ruler) {
      ruler.style.display = this.isReadingRulerActive ? 'block' : 'none';
      if (this.isReadingRulerActive) {
        ruler.style.top = '140px';
      }
    }
    if (btn) btn.classList.toggle('active', this.isReadingRulerActive);

    this.announce(this.isReadingRulerActive ? 'تم تشغيل مسطرة القراءة البصرية. يمكنك تحريكها بالفأرة أو بالأسهم' : 'تم إيقاف مسطرة القراءة');
  },

  // -------------------------------------------------------------
  // Arabic Braille Converter & Exporter
  // -------------------------------------------------------------
  toArabicBraille(arabicText) {
    if (!arabicText) return '';
    let braille = '';
    for (let char of arabicText) {
      braille += this.brailleMap[char] || char;
    }
    return braille;
  },

  downloadBrailleFile(title, arabicContent, isBrl = false) {
    const brailleContent = this.toArabicBraille(arabicContent);
    const header = `منصة بصيرة للذكاء الاصطناعي - ${title}\nالمشرف العام: المهندس محمد عاطف\n` +
                   `-----------------------------------------------------\n` +
                   `النص الأصلي:\n${arabicContent}\n\n` +
                   `نص برايل العربي:\n${brailleContent}\n`;

    const blob = new Blob([isBrl ? brailleContent : header], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `baseera_${title.replace(/\s+/g, '_')}.${isBrl ? 'brl' : 'txt'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.announce(`تم تحميل ملف برايل ${isBrl ? 'BRL' : 'TXT'} بنجاح`);
  },

  // -------------------------------------------------------------
  // Keyboard Shortcuts Navigation
  // -------------------------------------------------------------
  setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Must have Alt pressed
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            if (window.App) window.App.navigate('home');
            break;
          case '2':
            e.preventDefault();
            if (window.App) window.App.navigate('about-ai');
            break;
          case '3':
            e.preventDefault();
            if (window.App) window.App.navigate('edtech');
            break;
          case '4':
            e.preventDefault();
            if (window.App) window.App.navigate('tools');
            break;
          case '5':
            e.preventDefault();
            if (window.App) window.App.navigate('quizzes');
            break;
          case '6':
            e.preventDefault();
            if (window.App) window.App.navigate('dashboard');
            break;
          case '7':
            e.preventDefault();
            if (window.App) window.App.navigate('discussions');
            break;
          case '8':
            e.preventDefault();
            if (window.App) window.App.navigate('accessibility-center');
            break;
          case '9':
            e.preventDefault();
            if (window.App) window.App.navigate('admin');
            break;
          case '0':
            e.preventDefault();
            if (window.App) window.App.navigate('contact');
            break;
          case 'r':
          case 'R':
          case 'ق':
            e.preventDefault();
            this.toggleReadingRuler();
            break;
          case 's':
          case 'S':
          case 'س':
            e.preventDefault();
            if (this.synth && this.synth.speaking) {
              this.stopSpeech();
              this.announce('تم إيقاف الصوت.');
            } else {
              const activeSection = document.querySelector('.platform-section.active');
              if (activeSection) {
                this.speak(activeSection.innerText);
              }
            }
            break;
          case 'm':
          case 'M':
          case 'م':
            e.preventDefault();
            this.toggleVoiceRecognition();
            break;
          case 'h':
          case 'H':
          case 'ا':
            e.preventDefault();
            if (window.App) window.App.openShortcutsModal();
            break;
        }
      }
    });
  },

  // -------------------------------------------------------------
  // Load Saved Preferences
  // -------------------------------------------------------------
  loadSavedPreferences() {
    const savedTheme = localStorage.getItem('baseera_theme') || 'light';
    this.setTheme(savedTheme);

    const savedSpeed = localStorage.getItem('baseera_tts_speed');
    if (savedSpeed) {
      this.ttsRate = parseFloat(savedSpeed);
      const sel = document.getElementById('tts-speed-select');
      if (sel) sel.value = this.ttsRate;
    }

    const savedScale = localStorage.getItem('baseera_font_scale');
    if (savedScale) {
      this.fontScale = parseInt(savedScale, 10);
      document.documentElement.style.setProperty('--font-base-scale', `${this.fontScale}%`);
    }

    if (localStorage.getItem('baseera_dyslexia') === '1') {
      this.toggleDyslexiaFont();
    }
  }
};

window.Accessibility = Accessibility;
