/* ==============================================================================
   منصة بصيرة التعليمية للذكاء الاصطناعي (Baseera AI Educational Platform)
   Core Application Router & Interactive UI Engine
   Supervisor: المهندس محمد عاطف
   ============================================================================== */

const App = {
  activeSection: 'home',
  courses: [],
  tools: [],
  quizzes: [],
  activeChapterData: null,
  activeQuizData: null,

  async init() {
    console.log('🚀 Initializing Baseera AI Platform...');
    await Auth.refreshProfile();
    Auth.updateHeaderProfile();
    this.setupNavigation();
    this.setupChatbot();
    await this.loadInitialData();
    this.navigate('home');
  },

  // -------------------------------------------------------------
  // Load Platform Data from API
  // -------------------------------------------------------------
  async loadInitialData() {
    try {
      const [coursesRes, toolsRes, statsRes] = await Promise.all([
        fetch('/api/courses'),
        fetch('/api/tools'),
        fetch('/api/stats')
      ]);

      const coursesData = await coursesRes.json();
      const toolsData = await toolsRes.json();
      const statsData = await statsRes.json();

      if (coursesData.success) this.courses = coursesData.courses;
      if (toolsData.success) this.tools = toolsData.tools;

      if (statsData.success) {
        this.renderStats(statsData.stats);
      }
    } catch (e) {
      console.log('Using local embedded dataset');
    }

    // Resilient fallback from window.BASEERA_DATA
    if ((!this.courses || this.courses.length === 0) && window.BASEERA_DATA) {
      this.courses = window.BASEERA_DATA.courses || [];
      this.tools = window.BASEERA_DATA.aiTools || [];
      this.renderStats(window.BASEERA_DATA.stats || {});
    }
  },

  renderStats(stats) {
    const elStudents = document.getElementById('stat-students-count');
    const elHours = document.getElementById('stat-hours-count');
    const elCerts = document.getElementById('stat-certs-count');
    const elChapters = document.getElementById('stat-chapters-count');

    if (elStudents) elStudents.textContent = stats.activeStudents || '1,540+';
    if (elHours) elHours.textContent = stats.completedHours || '6,250+';
    if (elCerts) elCerts.textContent = stats.certificatesIssued || '920+';
    if (elChapters) elChapters.textContent = stats.totalChapters || '9';
  },

  // -------------------------------------------------------------
  // Router & Navigation
  // -------------------------------------------------------------
  setupNavigation() {
    document.querySelectorAll('[data-target-section]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const target = btn.getAttribute('data-target-section');
        this.navigate(target);
      });
    });
  },

  navigate(sectionId) {
    if (sectionId === 'admin' && !Auth.isAdmin()) {
      Auth.openModal('admin-login-modal');
      Accessibility.announce('لوحة الإدارة تتطلب تسجيل دخول المشرف العام المهندس محمد عاطف.');
      return;
    }

    if ((sectionId === 'dashboard' || sectionId === 'quizzes') && !Auth.isAuthenticated()) {
      Auth.openModal('student-gateway-modal');
      Accessibility.announce('يرجى تسجيل دخول الطالب أولاً للوصول إلى هذا القسم.');
      return;
    }

    this.activeSection = sectionId;

    // Switch section views
    document.querySelectorAll('.platform-section').forEach(sec => {
      sec.classList.remove('active');
    });
    const targetEl = document.getElementById(`section-${sectionId}`);
    if (targetEl) {
      targetEl.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Update active nav button
    document.querySelectorAll('.nav-link-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-target-section') === sectionId);
    });

    // Announce section title for screen readers
    const sectionNames = {
      'home': 'الصفحة الرئيسية لمنصة بصيرة',
      'about-ai': 'فصول الذكاء الاصطناعي التسعة',
      'edtech': 'محاور تكنولوجيا التعليم والتحول الرقمي',
      'tools': 'مكتبة أدوات الذكاء الاصطناعي للطلاب والباحثين',
      'quizzes': 'الاختبارات التفاعلية ونظام التحفيز الذكي',
      'dashboard': 'لوحة تحكم الطالب والشهادات الرسمية المعتمدة',
      'discussions': 'غرف النقاش والمجتمع مع المهندس محمد عاطف',
      'accessibility-center': 'مركز إمكانية الوصول والأدوات المساعدة المتخصصة',
      'admin': 'لوحة إدارة المشرف العام المهندس محمد عاطف',
      'contact': 'صفحة اتصل بنا والدعم الفني للمهندس محمد عاطف'
    };

    const sectionTitle = sectionNames[sectionId] || sectionId;
    Accessibility.announce(`انتقلت الآن إلى: ${sectionTitle}`);

    // Render section-specific contents
    if (sectionId === 'about-ai') this.renderCoursesGrid();
    if (sectionId === 'tools') this.renderToolsGrid();
    if (sectionId === 'quizzes') this.renderQuizzesList();
    if (sectionId === 'dashboard') this.renderDashboard();
    if (sectionId === 'discussions') this.renderDiscussions();
    if (sectionId === 'admin') this.renderAdminPanel();
  },

  // -------------------------------------------------------------
  // MODULE 2: ABOUT AI - 9 CHAPTERS
  // -------------------------------------------------------------
  renderCoursesGrid() {
    const grid = document.getElementById('courses-grid-container');
    if (!grid) return;

    if (!this.courses || this.courses.length === 0) {
      grid.innerHTML = '<p>جاري تحميل الفصول الدراسية...</p>';
      return;
    }

    const user = Auth.getUser();
    const completed = (user && user.completedLessons) || [];

    grid.innerHTML = this.courses.map(course => {
      const isDone = completed.includes(Number(course.chapterNum));
      return `
        <article class="chapter-card" tabindex="0" aria-label="${course.title}">
          <div>
            <div class="chapter-header">
              <span class="chapter-badge">الوحدة ${course.chapterNum}</span>
              ${isDone ? '<span style="color: var(--success); font-weight: bold;"><i class="fas fa-check-circle"></i> مكتمل</span>' : ''}
            </div>
            <h3 class="chapter-title">${course.title}</h3>
            <p class="chapter-desc">${course.shortDesc}</p>
          </div>
          <div class="chapter-footer">
            <button class="btn-primary" onclick="App.openChapterModal(${course.chapterNum})" aria-label="عرض وقراءة محتوى ${course.title}">
              <i class="fas fa-book-reader" aria-hidden="true"></i> دراسة الوحدة
            </button>
            <button class="access-btn" onclick="Accessibility.speak('${course.shortDesc.replace(/'/g, "\\'")}')" title="استمع لملخص الوحدة" aria-label="استمع لملخص صوتي للوحدة ${course.chapterNum}">
              <i class="fas fa-volume-up" aria-hidden="true"></i> استماع
            </button>
          </div>
        </article>
      `;
    }).join('');
  },

  async openChapterModal(chapterNum) {
    try {
      let course = null;
      try {
        const res = await fetch(`/api/courses/${chapterNum}`);
        const data = await res.json();
        if (data.success && data.course) course = data.course;
      } catch (err) {}

      if (!course && window.BASEERA_DATA) {
        course = (window.BASEERA_DATA.courses || []).find(c => Number(c.chapterNum) === Number(chapterNum));
      }
      if (!course) return;

      this.activeChapterData = course;
      const c = course;

      const titleEl = document.getElementById('chapter-modal-title');
      const contentEl = document.getElementById('chapter-modal-content');

      if (titleEl) titleEl.textContent = c.title;

      if (contentEl) {
        contentEl.innerHTML = `
          <!-- Accessible Audio Bar -->
          <div class="audio-player-bar">
            <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
              <button class="btn-primary" onclick="App.playChapterAudio()" aria-label="تشغيل الشرح الصوتي الكامل للوحدة">
                <i class="fas fa-play" aria-hidden="true"></i> قراءة الوحدة صوتياً
              </button>
              <button class="access-btn" onclick="Accessibility.stopSpeech()" aria-label="إيقاف القراءة الصوتية">
                <i class="fas fa-stop" aria-hidden="true"></i> إيقاف الصوت
              </button>
              <div class="tts-speed-selector">
                <label for="chapter-tts-speed" class="sr-only">سرعة القراءة الصوتية</label>
                <i class="fas fa-tachometer-alt" aria-hidden="true"></i>
                <select id="chapter-tts-speed" onchange="Accessibility.setSpeed(this.value)">
                  <option value="1.0">1x عادي</option>
                  <option value="1.25">1.25x</option>
                  <option value="1.5">1.5x سريع</option>
                  <option value="2.0">2x فائق</option>
                  <option value="2.5">2.5x</option>
                </select>
              </div>
            </div>

            <!-- Braille Export Buttons -->
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <button class="access-btn" onclick="Accessibility.downloadBrailleFile('${c.title}', '${c.summary.replace(/'/g, "\\'")}', false)" title="تحميل ملف ملخص برايل TXT" aria-label="تحميل ملخص الوحدة بصيغة نصية">
                <i class="fas fa-braille" aria-hidden="true"></i> برايل TXT
              </button>
              <button class="access-btn" onclick="Accessibility.downloadBrailleFile('${c.title}', '${c.summary.replace(/'/g, "\\'")}', true)" title="تحميل ملف برايل BRL للأسطر الإلكترونية" aria-label="تحميل ملخص برايل بصيغة BRL">
                <i class="fas fa-download" aria-hidden="true"></i> ملف BRL
              </button>
            </div>
          </div>

          <!-- Simple Explanation Mode Toggle for Blind & Special Needs -->
          <div style="margin: 1rem 0; display: flex; align-items: center; justify-content: space-between; background: var(--bg-surface-elevated); padding: 0.75rem 1rem; border-radius: 8px;">
            <span style="font-weight: 700;"><i class="fas fa-hand-holding-heart" style="color: var(--accent);"></i> الوضع المبسط للمكفوفين وذوي الاحتياجات الخاصة:</span>
            <button id="btn-toggle-simple-mode" class="access-btn" onclick="App.toggleSimpleMode()" aria-label="تبديل الشرح إلى أسلوب التشبيهات البسيطة للمكفوفين">
              <i class="fas fa-toggle-off" id="simple-toggle-icon"></i> تفعيل الشرح المبسط
            </button>
          </div>

          <!-- Standard Academic Content -->
          <div id="chapter-academic-content" style="display: block;">
            <h4 style="font-size: 1.2rem; font-weight: 800; margin-bottom: 0.5rem; color: var(--primary);">المحتوى الأكاديمي للوحدة:</h4>
            <p style="font-size: 1.05rem; line-height: 1.8; margin-bottom: 1.5rem;">${c.content}</p>
          </div>

          <!-- Simplified Mode Content (Hidden by default) -->
          <div id="chapter-simplified-content" class="simple-mode-box" style="display: none;">
            <div class="simple-mode-title">
              <i class="fas fa-star" aria-hidden="true"></i>
              الشرح المبسط بتشبيهات حسية ولمسية (Universal Accessibility)
            </div>
            <p style="font-size: 1.1rem; line-height: 1.8;">${c.simplifiedContent}</p>
          </div>

          <!-- Practical Real-World Examples -->
          <div style="background: var(--bg-surface-elevated); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.25rem; margin-bottom: 1.5rem;">
            <h4 style="font-size: 1.15rem; font-weight: 800; margin-bottom: 0.75rem; color: var(--text-primary);">
              <i class="fas fa-lightbulb" style="color: #eab308;"></i> أمثلة تطبيقية من الحياة اليومية:
            </h4>
            <ul style="padding-right: 1.5rem; line-height: 1.8;">
              ${(c.examples || []).map(ex => `<li style="margin-bottom: 0.5rem;">${ex}</li>`).join('')}
            </ul>
          </div>

          <!-- Interactive Activities -->
          <div style="background: var(--bg-surface-elevated); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.25rem; margin-bottom: 1.5rem;">
            <h4 style="font-size: 1.15rem; font-weight: 800; margin-bottom: 0.75rem; color: var(--text-primary);">
              <i class="fas fa-tasks" style="color: var(--accent);"></i> أنشطة تفاعلية موصى بها:
            </h4>
            <ul style="padding-right: 1.5rem; line-height: 1.8;">
              ${(c.activities || []).map(act => `<li style="margin-bottom: 0.5rem;">${act}</li>`).join('')}
            </ul>
          </div>

          <!-- Chapter Summary -->
          <div style="background: var(--primary-light); border-right: 4px solid var(--primary); padding: 1rem; border-radius: 0 8px 8px 0; margin-bottom: 1.5rem;">
            <h4 style="font-weight: 800; color: var(--primary); margin-bottom: 0.35rem;">خلاصة الوحدة:</h4>
            <p style="font-weight: 600;">${c.summary}</p>
          </div>

          <!-- Take Quiz Direct Action -->
          <div style="display: flex; justify-content: flex-end; gap: 1rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
            <button class="btn-primary" onclick="App.startQuizDirectly(${c.chapterNum})" aria-label="بدء اختبار تقييم الوحدة ${c.chapterNum}">
              <i class="fas fa-vial" aria-hidden="true"></i> اختبر معلوماتك في هذه الوحدة الآن
            </button>
          </div>
        `;
      }

      Auth.openModal('chapter-viewer-modal');
      Accessibility.announce(`تم فتح محتوى ${c.title}.`);
    } catch (e) {
      console.error('Error fetching chapter details:', e);
    }
  },

  playChapterAudio() {
    if (!this.activeChapterData) return;
    const isSimplified = document.getElementById('chapter-simplified-content').style.display !== 'none';
    const textToRead = isSimplified
      ? `الشرح المبسط للوحدة ${this.activeChapterData.chapterNum}: ${this.activeChapterData.simplifiedContent}. خلاصة الوحدة: ${this.activeChapterData.summary}`
      : `${this.activeChapterData.title}. ${this.activeChapterData.content}. خلاصة الوحدة: ${this.activeChapterData.summary}`;

    Accessibility.speak(textToRead);
  },

  toggleSimpleMode() {
    const academicEl = document.getElementById('chapter-academic-content');
    const simpleEl = document.getElementById('chapter-simplified-content');
    const toggleIcon = document.getElementById('simple-toggle-icon');
    const btn = document.getElementById('btn-toggle-simple-mode');

    if (!simpleEl) return;

    const isCurrentlyHidden = simpleEl.style.display === 'none';
    if (isCurrentlyHidden) {
      simpleEl.style.display = 'block';
      academicEl.style.display = 'none';
      if (toggleIcon) toggleIcon.className = 'fas fa-toggle-on';
      if (btn) btn.classList.add('active');
      Accessibility.announce('تم تفعيل الشرح المبسط للمكفوفين.');
      if (this.activeChapterData) {
        Accessibility.speak(`الشرح المبسط: ${this.activeChapterData.simplifiedContent}`);
      }
    } else {
      simpleEl.style.display = 'none';
      academicEl.style.display = 'block';
      if (toggleIcon) toggleIcon.className = 'fas fa-toggle-off';
      if (btn) btn.classList.remove('active');
      Accessibility.announce('تمت العودة إلى المحتوى الأكاديمي القياسي.');
    }
  },

  // -------------------------------------------------------------
  // MODULE 4: AI TOOLS LIBRARY
  // -------------------------------------------------------------
  renderToolsGrid(filterCategory = 'all', searchQuery = '') {
    const container = document.getElementById('tools-grid-container');
    if (!container) return;

    let filtered = this.tools || [];
    if (filterCategory !== 'all') {
      filtered = filtered.filter(t => t.category.includes(filterCategory));
    }
    if (searchQuery && searchQuery.trim() !== '') {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.bestUse.toLowerCase().includes(q)
      );
    }

    if (filtered.length === 0) {
      container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem;">لا توجد أدوات مطابقة لخيارات البحث.</div>';
      return;
    }

    container.innerHTML = filtered.map(t => `
      <article class="chapter-card" tabindex="0" aria-label="أداة ${t.name}">
        <div>
          <div class="chapter-header">
            <span class="chapter-badge"><i class="fas ${t.icon || 'fa-robot'}"></i> ${t.badge}</span>
            <span style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600;">${t.provider}</span>
          </div>
          <h3 class="chapter-title">${t.name}</h3>
          <p style="color: var(--accent); font-weight: 700; font-size: 0.9rem; margin-bottom: 0.5rem;">${t.category}</p>
          <p class="chapter-desc">${t.description}</p>

          <div style="background: var(--bg-surface-elevated); border: 1px dashed var(--border-color); border-radius: 8px; padding: 0.75rem; margin-bottom: 1rem; font-size: 0.9rem;">
            <p><strong><i class="fas fa-universal-access" style="color: var(--primary);"></i> إمكانية الوصول:</strong> ${t.accessibleNotes}</p>
            <p style="margin-top: 0.35rem;"><strong><i class="fas fa-star" style="color: #eab308;"></i> أفضل استخدام:</strong> ${t.bestUse}</p>
          </div>
        </div>

        <div class="chapter-footer">
          <a href="${t.url}" target="_blank" rel="noopener noreferrer" class="btn-primary" aria-label="زيارة موقع أداة ${t.name} في علامة تبويب جديدة">
            <i class="fas fa-external-link-alt" aria-hidden="true"></i> فتح الأداة
          </a>
          <button class="access-btn" onclick="Accessibility.speak('أداة ${t.name}: ${t.description.replace(/'/g, "\\'")}. ملاحظات الوصول: ${t.accessibleNotes.replace(/'/g, "\\'")}')" aria-label="استمع لتفاصيل أداة ${t.name}">
            <i class="fas fa-volume-up" aria-hidden="true"></i> استماع
          </button>
        </div>
      </article>
    `).join('');
  },

  // -------------------------------------------------------------
  // MODULE 5: INTERACTIVE QUIZZES & MOTIVATIONAL SYSTEM
  // -------------------------------------------------------------
  async renderQuizzesList() {
    const container = document.getElementById('quizzes-selector-container');
    if (!container) return;

    try {
      let quizzes = null;
      try {
        const res = await fetch('/api/quizzes');
        const data = await res.json();
        if (data.success && data.quizzes) quizzes = data.quizzes;
      } catch (e) {}

      if (!quizzes && window.BASEERA_DATA) {
        quizzes = window.BASEERA_DATA.quizzes || [];
      }
      this.quizzes = quizzes || [];

      container.innerHTML = this.quizzes.map(quiz => `
        <div class="stat-card" style="cursor: pointer; justify-content: space-between;" onclick="App.loadQuiz(${quiz.chapterNum})" tabindex="0" role="button" aria-label="${quiz.title}">
          <div style="display: flex; align-items: center; gap: 1rem;">
            <div class="stat-icon"><i class="fas fa-question-circle"></i></div>
            <div>
              <h4 style="font-size: 1.1rem; font-weight: 800;">اختبار الوحدة ${quiz.chapterNum}</h4>
              <p style="color: var(--text-muted); font-size: 0.85rem;">عدد الأسئلة: ${quiz.questions.length} أسئلة متنوعة</p>
            </div>
          </div>
          <button class="btn-primary" style="padding: 0.4rem 0.85rem; font-size: 0.85rem;">
            بدء الاختبار <i class="fas fa-arrow-left"></i>
          </button>
        </div>
      `).join('');

      // Auto load first quiz if none loaded
      if (!this.activeQuizData && this.quizzes.length > 0) {
        this.loadQuiz(1);
      }
    } catch (e) {
      console.error('Error loading quizzes list:', e);
    }
  },

  startQuizDirectly(chapterNum) {
    Auth.closeModal('chapter-viewer-modal');
    this.navigate('quizzes');
    setTimeout(() => {
      this.loadQuiz(chapterNum);
    }, 150);
  },

  async loadQuiz(chapterNum) {
    try {
      let quiz = null;
      try {
        const res = await fetch(`/api/quizzes/chapter/${chapterNum}`);
        const data = await res.json();
        if (data.success && data.quiz) quiz = data.quiz;
      } catch (e) {}

      if (!quiz && window.BASEERA_DATA) {
        quiz = (window.BASEERA_DATA.quizzes || []).find(q => Number(q.chapterNum) === Number(chapterNum));
      }
      if (!quiz) return;

      this.activeQuizData = quiz;
      const q = quiz;

      const titleEl = document.getElementById('active-quiz-title');
      const containerEl = document.getElementById('active-quiz-questions');
      const resultsEl = document.getElementById('active-quiz-results');

      if (titleEl) titleEl.textContent = q.title;
      if (resultsEl) resultsEl.style.display = 'none';

      if (containerEl) {
        containerEl.innerHTML = `
          <form id="quiz-active-form" onsubmit="App.submitQuiz(event, ${q.chapterNum})">
            ${q.questions.map((item, qIdx) => `
              <div class="question-item" tabindex="0" aria-label="السؤال رقم ${qIdx + 1}: ${item.question}">
                <div class="question-title">
                  <span style="background: var(--primary-light); color: var(--primary); padding: 0.2rem 0.6rem; border-radius: 6px; font-size: 0.9rem; margin-left: 0.5rem;">
                    سؤال ${qIdx + 1}
                  </span>
                  ${item.question}
                  <button type="button" class="access-btn" style="float: left; padding: 0.2rem 0.5rem;" onclick="Accessibility.speak('${item.question.replace(/'/g, "\\'")}')" aria-label="قراءة السؤال بصوت واضح">
                    <i class="fas fa-volume-up"></i>
                  </button>
                </div>

                <div class="options-group" role="radiogroup" aria-labelledby="q-${item.id || qIdx}">
                  ${item.options.map((opt, optIdx) => `
                    <label class="option-label" tabindex="0">
                      <input type="radio" name="${item.id || `q${qIdx + 1}`}" value="${optIdx}" required>
                      <span>${opt}</span>
                    </label>
                  `).join('')}
                </div>
              </div>
            `).join('')}

            <div style="display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1.5rem;">
              <button type="submit" class="btn-primary" style="padding: 0.85rem 2rem; font-size: 1.1rem;">
                <i class="fas fa-check-circle" aria-hidden="true"></i> تسليم الإجابات والحصول على التقييم الفوري
              </button>
            </div>
          </form>
        `;
      }

      Accessibility.announce(`تم تحميل ${q.title}، يمكنك البدء بالإجابة.`);
    } catch (e) {
      console.error('Error loading quiz:', e);
    }
  },

  async submitQuiz(event, chapterNum) {
    if (event) event.preventDefault();

    if (!Auth.isAuthenticated()) {
      Auth.openModal('student-gateway-modal');
      return;
    }

    const form = document.getElementById('quiz-active-form');
    if (!form) return;

    const formData = new FormData(form);
    const answers = {};
    for (let [key, val] of formData.entries()) {
      answers[key] = val;
    }

    try {
      let result = null;
      try {
        const token = Auth.getToken();
        const res = await fetch('/api/quizzes/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ chapterNum, answers })
        });
        const data = await res.json();
        if (data.success) {
          result = data.result;
          if (data.user) Auth.setUser(data.user);
        }
      } catch (netErr) {}

      // Fallback for static hosting
      if (!result && window.BASEERA_DATA) {
        const quiz = (window.BASEERA_DATA.quizzes || []).find(q => Number(q.chapterNum) === Number(chapterNum));
        if (quiz) {
          let correctCount = 0;
          const gradedQuestions = quiz.questions.map((q, idx) => {
            const stAns = answers ? answers[q.id || `q${idx + 1}`] : undefined;
            const isCorrect = Number(stAns) === Number(q.correct);
            if (isCorrect) correctCount++;
            return {
              id: q.id,
              question: q.question,
              studentAnswer: stAns,
              correctAnswer: q.correct,
              isCorrect,
              explanation: q.explanation
            };
          });

          const totalQuestions = quiz.questions.length;
          const percentage = Math.round((correctCount / totalQuestions) * 100);
          let motivationalFeedback = '';
          let performanceTier = '';
          if (percentage >= 80) {
            performanceTier = 'excellent';
            motivationalFeedback = 'مستوى استثنائي! أداؤك يعكس فهماً عميقاً واستيعاباً تقنياً متقدماً. أنت مستعد تماماً لقيادة عصر الذكاء الاصطناعي بكل ثقة واقتدار!';
          } else if (percentage >= 50) {
            performanceTier = 'good';
            motivationalFeedback = 'أداء رائع وتقدم ملحوظ! لديك أساس قوي ومبشر جداً. راجع بعض المفاهيم التي تعثرت بها لتصل إلى درجة الامتياز المطلق في المحاولة القادمة.';
          } else {
            performanceTier = 'supportive';
            motivationalFeedback = 'كل خطوة هي بداية تعلم حقيقي! لا تقلق أبداً، الذكاء الاصطناعي علم يتطلب التكرار والتجربة. استمع للشرح الصوتي والمبسط مرة أخرى وستحقق أعلى الدرجات!';
          }

          const user = Auth.getUser() || { fullName: 'طالب بصيرة', email: 'student@gmail.com', xpPoints: 100, badges: [] };
          user.xpPoints = (user.xpPoints || 100) + (percentage >= 80 ? 100 : (percentage >= 50 ? 60 : 30));
          user.badges = user.badges || ["شارة الانضمام"];
          const badgeName = `بطل الفصل ${chapterNum}`;
          if (!user.badges.includes(badgeName)) user.badges.push(badgeName);
          user.completedLessons = user.completedLessons || [];
          if (!user.completedLessons.includes(Number(chapterNum))) user.completedLessons.push(Number(chapterNum));
          Auth.setUser(user);

          result = {
            score: percentage,
            totalQuestions,
            correctCount,
            percentage,
            motivationalFeedback,
            performanceTier,
            gradedQuestions
          };
        }
      }

      if (result) {
        this.displayQuizResults(result);
      }
    } catch (e) {
      console.error('Submit quiz error:', e);
    }
  },

  displayQuizResults(result) {
    const resultsEl = document.getElementById('active-quiz-results');
    if (!resultsEl) return;

    resultsEl.style.display = 'block';

    let tierClass = 'tier-supportive';
    let tierTitle = 'محاولة مشجعة ومثابرة';
    if (result.score >= 80) {
      tierClass = 'tier-excellent';
      tierTitle = 'مستوى استثنائي وامتياز تقني!';
    } else if (result.score >= 50) {
      tierClass = 'tier-good';
      tierTitle = 'أداء رائع وتقدم ملحوظ!';
    }

    resultsEl.innerHTML = `
      <div class="motivational-box ${tierClass}" tabindex="0" aria-label="نتيجة الاختبار: ${result.score}%، ${result.motivationalFeedback}">
        <div class="score-badge-circle">
          ${result.score}%
        </div>
        <h3 style="font-size: 1.5rem; font-weight: 900;">${tierTitle}</h3>
        <p style="font-size: 1.15rem; font-weight: 700; max-width: 750px; line-height: 1.8;">
          ${result.motivationalFeedback}
        </p>
        <p style="font-size: 0.95rem; font-weight: 600;">
          عدد الإجابات الصحيحة: ${result.correctCount} من أصل ${result.totalQuestions} سؤال.
        </p>
        <div style="display: flex; gap: 0.75rem; margin-top: 1rem;">
          <button class="access-btn" onclick="Accessibility.speak('نتيجتك هي ${result.score} بالمائة. ${result.motivationalFeedback.replace(/'/g, "\\'")}')" aria-label="الاستماع للتقييم الصوتي والرسالة التحفيزية">
            <i class="fas fa-volume-up"></i> استمع للتقييم الصوتي
          </button>
          <button class="btn-primary" onclick="App.navigate('dashboard')" aria-label="الانتقال للوحة الطالب وإصدار الشهادة">
            <i class="fas fa-award"></i> عرض شاراتك ولوحة التحكم
          </button>
        </div>
      </div>

      <!-- Explanations breakdown -->
      <div style="margin-top: 2rem;">
        <h4 style="font-size: 1.25rem; font-weight: 800; margin-bottom: 1rem;">مراجعة الإجابات والشرح النموذجي:</h4>
        ${(result.gradedQuestions || []).map((q, idx) => `
          <div class="question-item" style="border-right: 6px solid ${q.isCorrect ? 'var(--success)' : 'var(--error)'};">
            <p style="font-weight: 800; font-size: 1.05rem; margin-bottom: 0.5rem;">
              س ${idx + 1}: ${q.question}
              <span style="color: ${q.isCorrect ? 'var(--success)' : 'var(--error)'}; font-weight: bold; margin-right: 0.5rem;">
                (${q.isCorrect ? 'إجابة صحيحة ✓' : 'إجابة تحتاج لمراجعة ✗'})
              </span>
            </p>
            <p style="color: var(--text-secondary); font-size: 0.95rem;">
              <strong>الشرح والتوضيح:</strong> ${q.explanation}
            </p>
          </div>
        `).join('')}
      </div>
    `;

    resultsEl.scrollIntoView({ behavior: 'smooth' });

    // Speak motivational message automatically
    Accessibility.announce(`انتهى الاختبار، حصلت على ${result.score} بالمائة.`);
    Accessibility.speak(`نتيجتك في الاختبار هي ${result.score} بالمائة. ${result.motivationalFeedback}`);
  },

  // -------------------------------------------------------------
  // MODULE 6: STUDENT DASHBOARD & VERIFIED CERTIFICATE
  // -------------------------------------------------------------
  async renderDashboard() {
    const user = Auth.getUser();
    if (!user) return;

    const nameEl = document.getElementById('dash-student-name');
    const xpEl = document.getElementById('dash-student-xp');
    const nidEl = document.getElementById('dash-student-nid');
    const badgesContainer = document.getElementById('dash-badges-container');
    const progressEl = document.getElementById('dash-lessons-progress');

    if (nameEl) nameEl.textContent = user.fullName;
    if (xpEl) xpEl.textContent = `${user.xpPoints || 100} XP`;
    if (nidEl) nidEl.textContent = user.nationalId ? `الرقم القومي: ${user.nationalId}` : 'الرقم القومي: لم يُسجل بعد (يمكنك إضافته عند إصدار الشهادة)';

    // Badges
    if (badgesContainer) {
      const badges = user.badges || ["شارة الانضمام"];
      badgesContainer.innerHTML = badges.map(b => `
        <div style="background: var(--bg-surface-elevated); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.5rem 0.85rem; display: inline-flex; align-items: center; gap: 0.4rem; font-weight: 700; font-size: 0.85rem;">
          <i class="fas fa-medal" style="color: #eab308;"></i> ${b}
        </div>
      `).join('');
    }

    // Progress
    const completedCount = (user.completedLessons || []).length;
    const progressPercent = Math.min(100, Math.round((completedCount / 9) * 100));
    if (progressEl) {
      progressEl.innerHTML = `
        <div style="display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 0.35rem;">
          <span>الفصول المكتملة (${completedCount} من 9 فصول)</span>
          <span>${progressPercent}%</span>
        </div>
        <div style="height: 12px; background: var(--bg-surface-elevated); border-radius: 6px; overflow: hidden; border: 1px solid var(--border-color);">
          <div style="width: ${progressPercent}%; height: 100%; background: linear-gradient(90deg, var(--primary), var(--accent)); transition: width 0.5s ease;"></div>
        </div>
      `;
    }

    // Update Certificate Preview
    this.updateCertificate(user);
  },

  updateCertificate(user) {
    const certStudentName = document.getElementById('cert-student-fullname');
    const certNid = document.getElementById('cert-student-nid');
    const certDate = document.getElementById('cert-issue-date');

    if (certStudentName) certStudentName.textContent = user.fullName;
    if (certNid) certNid.textContent = user.nationalId ? `الرقم القومي المعتمد: ${user.nationalId}` : 'الرقم القومي: موثق إلكترونياً عبر منصة بصيرة';
    if (certDate) certDate.textContent = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
  },

  printCertificate() {
    window.print();
    Accessibility.announce('تم فتح نافذة الطباعة لإصدار الشهادة الرسمية.');
  },

  // -------------------------------------------------------------
  // MODULE 7: DISCUSSIONS (COMMUNITY & INSTRUCTOR)
  // -------------------------------------------------------------
  async renderDiscussions() {
    await Promise.all([
      this.loadPublicDiscussions(),
      this.loadPrivateDiscussions()
    ]);
  },

  async loadPublicDiscussions() {
    const container = document.getElementById('public-threads-container');
    if (!container) return;

    try {
      let list = null;
      try {
        const res = await fetch('/api/discussions/public');
        const data = await res.json();
        if (data.success) list = data.discussions;
      } catch (e) {}

      if (!list && window.BASEERA_DATA) {
        list = window.BASEERA_DATA.discussions || [];
      }
      if (!list) list = [];

      container.innerHTML = list.map(disc => `
        <article class="thread-card" tabindex="0" aria-label="مشاركة من ${disc.userName}">
          <div class="thread-user">
            <div class="thread-avatar">${disc.userName.charAt(0)}</div>
            <div>
              <h4 style="font-weight: 800; font-size: 1rem;">${disc.userName} ${disc.userRole === 'admin' ? '<span class="chapter-badge" style="font-size: 0.75rem;">المشرف العام</span>' : ''}</h4>
              <span style="font-size: 0.8rem; color: var(--text-muted);">${new Date(disc.createdAt).toLocaleDateString('ar-EG')}</span>
            </div>
            <button class="access-btn" style="margin-right: auto; padding: 0.2rem 0.5rem;" onclick="Accessibility.speak('${disc.message.replace(/'/g, "\\'")}')" aria-label="استماع لنص المشاركة">
              <i class="fas fa-volume-up"></i>
            </button>
          </div>
          <p style="font-size: 1.05rem; line-height: 1.7; margin-bottom: 1rem;">${disc.message}</p>

          <!-- Replies -->
          <div class="thread-replies">
            ${(disc.replies || []).map(r => `
              <div style="background: var(--bg-surface-elevated); padding: 0.75rem 1rem; border-radius: 8px;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.25rem;">
                  <strong style="color: var(--primary); font-size: 0.9rem;">${r.userName} ${r.userRole === 'admin' ? '(المشرف العام)' : ''}</strong>
                  <span style="font-size: 0.75rem; color: var(--text-muted);">${new Date(r.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p style="font-size: 0.95rem;">${r.message}</p>
              </div>
            `).join('')}

            <!-- Add Reply Form -->
            <form onsubmit="App.submitReply(event, '${disc.id}')" style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
              <input type="text" name="replyText" class="form-control" placeholder="اكتب رداً على هذه المشاركة..." required style="flex: 1; padding: 0.4rem 0.75rem; font-size: 0.9rem;">
              <button type="submit" class="btn-primary" style="padding: 0.4rem 1rem; font-size: 0.9rem;">رد</button>
            </form>
          </div>
        </article>
      `).join('');
    } catch (e) {
      console.error('Error loading public discussions:', e);
    }
  },

  async submitPublicDiscussion(event) {
    if (event) event.preventDefault();
    if (!Auth.isAuthenticated()) {
      Auth.openModal('student-gateway-modal');
      return;
    }

    const input = document.getElementById('public-message-input');
    const msg = input ? input.value.trim() : '';
    if (!msg) return;

    try {
      const res = await fetch('/api/discussions/public', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Auth.getToken()}`
        },
        body: JSON.stringify({ message: msg })
      });
      const data = await res.json();
      if (data.success) {
        if (input) input.value = '';
        this.loadPublicDiscussions();
        Accessibility.announce('تم نشر سؤالك في غرفة النقاش العامة بنجاح.');
      }
    } catch (e) {
      console.error('Error submitting public discussion:', e);
    }
  },

  async submitReply(event, discId) {
    if (event) event.preventDefault();
    if (!Auth.isAuthenticated()) {
      Auth.openModal('student-gateway-modal');
      return;
    }

    const form = event.target;
    const input = form.querySelector('input[name="replyText"]');
    const text = input ? input.value.trim() : '';
    if (!text) return;

    try {
      const res = await fetch(`/api/discussions/${discId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Auth.getToken()}`
        },
        body: JSON.stringify({ replyMessage: text })
      });
      const data = await res.json();
      if (data.success) {
        input.value = '';
        this.loadPublicDiscussions();
        Accessibility.announce('تمت إضافة الرد بنجاح.');
      }
    } catch (e) {
      console.error('Error submitting reply:', e);
    }
  },

  async loadPrivateDiscussions() {
    const container = document.getElementById('private-messages-container');
    if (!container) return;

    if (!Auth.isAuthenticated()) {
      container.innerHTML = '<p style="text-align: center; padding: 2rem;">يرجى تسجيل الدخول لعرض رسائلك الخاصة مع المشرف العام المهندس محمد عاطف.</p>';
      return;
    }

    try {
      const res = await fetch('/api/discussions/private', {
        headers: { 'Authorization': `Bearer ${Auth.getToken()}` }
      });
      const data = await res.json();
      if (!data.success) return;

      if (data.discussions.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 1.5rem;">لا توجد رسائل خاصة سابقة. يمكنك إرسال استفسار مباشر للمشرف العام أدناه.</p>';
        return;
      }

      container.innerHTML = data.discussions.map(disc => `
        <div class="thread-card" style="border-right: 4px solid var(--accent);">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
            <strong>${disc.userName} ➔ ${disc.recipientName || 'المهندس محمد عاطف'}</strong>
            <span style="font-size: 0.8rem; color: var(--text-muted);">${new Date(disc.createdAt).toLocaleDateString('ar-EG')}</span>
          </div>
          <p style="font-size: 1rem; margin-bottom: 0.75rem;">${disc.message}</p>
          ${(disc.replies || []).map(r => `
            <div style="background: var(--primary-light); padding: 0.65rem 0.85rem; border-radius: 6px; margin-top: 0.5rem;">
              <strong>${r.userName}:</strong> ${r.message}
            </div>
          `).join('')}
        </div>
      `).join('');
    } catch (e) {
      console.error('Error loading private discussions:', e);
    }
  },

  async submitPrivateMessage(event) {
    if (event) event.preventDefault();
    if (!Auth.isAuthenticated()) {
      Auth.openModal('student-gateway-modal');
      return;
    }

    const input = document.getElementById('private-message-input');
    const msg = input ? input.value.trim() : '';
    if (!msg) return;

    try {
      const res = await fetch('/api/discussions/private', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Auth.getToken()}`
        },
        body: JSON.stringify({ message: msg })
      });
      const data = await res.json();
      if (data.success) {
        if (input) input.value = '';
        this.loadPrivateDiscussions();
        Accessibility.announce(data.message);
        Accessibility.speak(data.message);
      }
    } catch (e) {
      console.error('Error submitting private message:', e);
    }
  },

  // -------------------------------------------------------------
  // MODULE 8: ACCESSIBILITY CENTER TOOLS
  // -------------------------------------------------------------
  runTTSStudio() {
    const input = document.getElementById('tts-studio-input');
    const text = input ? input.value.trim() : '';
    if (!text) {
      Accessibility.speak('يرجى كتابة نص في الصندوق لتجربة تحويله إلى صوت بشري واضح.');
      return;
    }
    Accessibility.speak(text);
  },

  async runImageDescriber(chartType = 'neural_network') {
    const outputEl = document.getElementById('image-describer-output');
    if (!outputEl) return;

    outputEl.innerHTML = '<p>جاري تحليل المخطط التعليمي وتوليد الوصف الصوتي الدلالي وفق معايير WCAG AAA...</p>';

    try {
      const res = await fetch('/api/ai/describe-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chartType, imageTitle: chartType === 'neural_network' ? 'شبكة عصبية عميقة' : 'فروع الذكاء الاصطناعي' })
      });
      const data = await res.json();
      if (data.success) {
        outputEl.innerHTML = `
          <div style="background: var(--bg-surface-elevated); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.25rem;">
            <h4 style="font-weight: 800; color: var(--primary); margin-bottom: 0.5rem;"><i class="fas fa-check-circle"></i> التحليل الدلالي للمخطط التعليمي:</h4>
            <p style="font-size: 1.05rem; line-height: 1.8; margin-bottom: 1rem;">${data.description}</p>
            <div style="display: flex; gap: 0.5rem;">
              <button class="btn-primary" onclick="Accessibility.speak('${data.description.replace(/'/g, "\\'")}')" aria-label="الاستماع للوصف الصوتي للمخطط">
                <i class="fas fa-volume-up"></i> استمع للوصف الصوتي
              </button>
            </div>
          </div>
        `;
        Accessibility.speak(data.description);
      }
    } catch (e) {
      outputEl.innerHTML = '<p>خطأ في تحليل الصورة.</p>';
    }
  },

  async runPromptLab() {
    const promptInput = document.getElementById('prompt-lab-input');
    const goalInput = document.getElementById('prompt-lab-goal');
    const outputEl = document.getElementById('prompt-lab-output');

    const promptText = promptInput ? promptInput.value.trim() : '';
    const targetGoal = goalInput ? goalInput.value.trim() : '';

    if (!promptText) {
      alert('يرجى إدخال نص البرومبت لاختباره.');
      return;
    }

    if (outputEl) outputEl.innerHTML = '<p>جاري تحليل وتقييم البرومبت...</p>';

    try {
      const res = await fetch('/api/ai/prompt-lab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptText, targetGoal })
      });
      const data = await res.json();
      if (data.success && outputEl) {
        outputEl.innerHTML = `
          <div style="background: var(--bg-surface-elevated); border: 2px solid var(--accent); border-radius: 12px; padding: 1.25rem;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
              <h4 style="font-size: 1.2rem; font-weight: 800;">تقييم جودة البرومبت:</h4>
              <span class="chapter-badge" style="font-size: 1.1rem; background: var(--accent); color: #fff;">${data.score}</span>
            </div>
            <div style="margin-bottom: 1rem;">
              <strong style="color: var(--success);"><i class="fas fa-thumbs-up"></i> نقاط القوة:</strong>
              <ul style="padding-right: 1.5rem; margin-top: 0.35rem;">
                ${data.strengths.map(s => `<li>${s}</li>`).join('')}
              </ul>
            </div>
            ${data.improvements.length > 0 ? `
              <div style="margin-bottom: 1rem;">
                <strong style="color: var(--warning);"><i class="fas fa-lightbulb"></i> مقترحات التحسين:</strong>
                <ul style="padding-right: 1.5rem; margin-top: 0.35rem;">
                  ${data.improvements.map(i => `<li>${i}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
            <div style="background: var(--bg-surface); border: 1px dashed var(--border-color); padding: 1rem; border-radius: 8px;">
              <strong style="color: var(--primary);">الصيغة المحسنة المقترحة:</strong>
              <p style="margin-top: 0.35rem; font-weight: 600;">${data.refinedPrompt}</p>
            </div>
          </div>
        `;
        Accessibility.announce(`حصل البرومبت على تقييم ${data.score}`);
      }
    } catch (e) {
      console.error('Prompt lab error:', e);
    }
  },

  // -------------------------------------------------------------
  // MODULE 9: ADMIN PANEL (المهندس محمد عاطف)
  // -------------------------------------------------------------
  async renderAdminPanel() {
    if (!Auth.isAdmin()) return;

    try {
      const [studentsRes, msgsRes, statsRes] = await Promise.all([
        fetch('/api/admin/students', { headers: { 'Authorization': `Bearer ${Auth.getToken()}` } }),
        fetch('/api/admin/contact-messages', { headers: { 'Authorization': `Bearer ${Auth.getToken()}` } }),
        fetch('/api/stats')
      ]);

      const studentsData = await studentsRes.json();
      const msgsData = await msgsRes.json();
      const statsData = await statsRes.json();

      const studentsContainer = document.getElementById('admin-students-table-body');
      const msgsContainer = document.getElementById('admin-messages-container');

      if (studentsContainer && studentsData.success) {
        studentsContainer.innerHTML = studentsData.students.map((s, idx) => `
          <tr>
            <td style="padding: 0.75rem; border-bottom: 1px solid var(--border-color); font-weight: bold;">${idx + 1}</td>
            <td style="padding: 0.75rem; border-bottom: 1px solid var(--border-color);">${s.fullName}</td>
            <td style="padding: 0.75rem; border-bottom: 1px solid var(--border-color);">${s.email}</td>
            <td style="padding: 0.75rem; border-bottom: 1px solid var(--border-color);">${s.nationalId || '<span style="color:var(--text-muted)">غير مسجل</span>'}</td>
            <td style="padding: 0.75rem; border-bottom: 1px solid var(--border-color); font-weight: 800; color: var(--primary);">${s.xpPoints || 100} XP</td>
            <td style="padding: 0.75rem; border-bottom: 1px solid var(--border-color);">${(s.completedLessons || []).length} فصول</td>
          </tr>
        `).join('');
      }

      if (msgsContainer && msgsData.success) {
        if (msgsData.messages.length === 0) {
          msgsContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 1.5rem;">لا توجد رسائل تواصل واردة جديدة.</p>';
        } else {
          msgsContainer.innerHTML = msgsData.messages.map(m => `
            <div class="thread-card">
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                <strong>${m.fullName} (${m.email} - هاتف: ${m.phone || 'غير مدرج'})</strong>
                <span style="font-size: 0.8rem; color: var(--text-muted);">${new Date(m.createdAt).toLocaleDateString('ar-EG')}</span>
              </div>
              <p style="font-weight: 700; color: var(--primary); margin-bottom: 0.25rem;">الموضوع: ${m.subject}</p>
              <p style="line-height: 1.6;">${m.message}</p>
            </div>
          `).join('');
        }
      }
    } catch (e) {
      console.error('Error loading admin data:', e);
    }
  },

  // -------------------------------------------------------------
  // MODULE 10: CONTACT FORM
  // -------------------------------------------------------------
  async handleContactSubmit(event) {
    if (event) event.preventDefault();

    const nameInput = document.getElementById('contact-name');
    const emailInput = document.getElementById('contact-email');
    const phoneInput = document.getElementById('contact-phone');
    const subjectInput = document.getElementById('contact-subject');
    const messageInput = document.getElementById('contact-message');
    const alertBox = document.getElementById('contact-alert');

    const fullName = nameInput ? nameInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';
    const phone = phoneInput ? phoneInput.value.trim() : '';
    const subject = subjectInput ? subjectInput.value.trim() : '';
    const message = messageInput ? messageInput.value.trim() : '';

    if (!fullName || !email || !message) {
      alert('يرجى ملء جميع الحقول الأساسية: الاسم، البريد، والرسالة.');
      return;
    }

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, phone, subject, message })
      });
      const data = await res.json();
      if (data.success) {
        if (nameInput) nameInput.value = '';
        if (emailInput) emailInput.value = '';
        if (phoneInput) phoneInput.value = '';
        if (subjectInput) subjectInput.value = '';
        if (messageInput) messageInput.value = '';

        if (alertBox) {
          alertBox.style.display = 'block';
          alertBox.textContent = data.message;
        }

        Accessibility.announce(data.message);
        Accessibility.speak(data.message);
      }
    } catch (e) {
      console.error('Contact error:', e);
    }
  },

  // -------------------------------------------------------------
  // FLOATING AI CHATBOT ASSISTANT "بصيرة"
  // -------------------------------------------------------------
  setupChatbot() {
    const botBtn = document.getElementById('floating-chatbot-btn');
    const botWin = document.getElementById('chatbot-window');
    const closeBtn = document.getElementById('close-chatbot-btn');
    const form = document.getElementById('chatbot-form');

    if (botBtn && botWin) {
      botBtn.addEventListener('click', () => {
        const isActive = botWin.classList.toggle('active');
        if (isActive) {
          const inp = document.getElementById('chat-input-field');
          if (inp) inp.focus();
          Accessibility.announce('تم فتح نافذة المساعد الذكي بصيرة.');
        }
      });
    }

    if (closeBtn && botWin) {
      closeBtn.addEventListener('click', () => {
        botWin.classList.remove('active');
        Accessibility.announce('تم إغلاق المساعد الذكي.');
      });
    }

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.sendChatMessage();
      });
    }
  },

  async sendChatMessage(predefinedQuery = null) {
    const input = document.getElementById('chat-input-field');
    const messagesBox = document.getElementById('chatbot-messages');
    const query = predefinedQuery || (input ? input.value.trim() : '');

    if (!query) return;

    if (messagesBox) {
      messagesBox.innerHTML += `
        <div class="bot-bubble outgoing">
          ${query}
        </div>
      `;
      messagesBox.scrollTop = messagesBox.scrollHeight;
    }

    if (input) input.value = '';

    try {
      let reply = '';
      try {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query })
        });
        const data = await res.json();
        if (data.success) reply = data.reply;
      } catch (e) {}

      if (!reply) {
        const q = query.toLowerCase();
        if (q.includes('مشرف') || q.includes('محمد عاطف') || q.includes('تواصل') || q.includes('هاتف')) {
          reply = 'المشرف العام ومؤسس المنصة هو المهندس محمد عاطف. في حالة وجود أي عطل أو استفسار يرجى التواصل مباشرة معه عبر البريد: matf37920@gmail.com أو الهاتف: 01142837070.';
        } else if (q.includes('اختصار') || q.includes('كيبورد')) {
          reply = 'مفاتيح الوصول السريع: Alt + 1 للرئيسية، Alt + 2 للفصول، Alt + 3 للتقنيات، Alt + 4 للأدوات، Alt + 5 للاختبارات، Alt + 6 للوحة الطالب، Alt + R لمسطرة القراءة، و Alt + S للنطق الصوتي.';
        } else if (q.includes('شهادة') || q.includes('تخرج')) {
          reply = 'يمكنك إصدار شهادتك المعتمدة مباشرة من لوحة تحكم الطالب (Student Dashboard) بمجرد إكمال الاختبارات بنجاح، وتحتوي على رمز QR والرقم القومي واسمك المعتمد.';
        } else {
          reply = `أهلاً بك في منصة بصيرة! استفسارك حول "${query}" مجاب عنه في فصولنا التعليمية التسعة ومكتبة الأدوات الذكية. تفضل باختيار أي فصل لبدء القراءة الصوتية أو خوض الاختبارات.`;
        }
      }

      if (messagesBox) {
        messagesBox.innerHTML += `
          <div class="bot-bubble incoming">
            <p>${reply}</p>
            <button class="access-btn" style="margin-top: 0.5rem; padding: 0.15rem 0.5rem; font-size: 0.8rem;" onclick="Accessibility.speak('${reply.replace(/'/g, "\\'")}')" aria-label="استمع لرد المساعد بصيرة">
              <i class="fas fa-volume-up"></i> استماع
            </button>
          </div>
        `;
        messagesBox.scrollTop = messagesBox.scrollHeight;
        Accessibility.announce(`رد المساعد بصيرة: ${reply}`);
      }
    } catch (e) {
      console.error('Chat error:', e);
    }
  },

  openShortcutsModal() {
    Auth.openModal('shortcuts-help-modal');
  }
};

window.App = App;
window.addEventListener('DOMContentLoaded', () => {
  Accessibility.init();
  App.init();
});
