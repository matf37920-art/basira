/* ==============================================================================
   منصة بصيرة التعليمية للذكاء الاصطناعي (Baseera AI Educational Platform)
   Authentication & Role-Based Access Control (RBAC) Module
   Supervisor: المهندس محمد عاطف
   ============================================================================== */

const Auth = {
  tokenKey: 'baseera_token',
  userKey: 'baseera_user',

  getToken() {
    return localStorage.getItem(this.tokenKey);
  },

  getUser() {
    try {
      const data = localStorage.getItem(this.userKey);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  setUser(user, token = null) {
    if (token) localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.userKey, JSON.stringify(user));
    this.updateHeaderProfile();
  },

  isAuthenticated() {
    return !!this.getToken();
  },

  isAdmin() {
    const user = this.getUser();
    return user && user.role === 'admin';
  },

  logout() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.updateHeaderProfile();
    if (window.Accessibility) {
      window.Accessibility.announce('تم تسجيل الخروج بنجاح.');
      window.Accessibility.speak('تم تسجيل الخروج من منصة بصيرة.');
    }
    if (window.App) {
      window.App.navigate('home');
    }
  },

  async refreshProfile() {
    const token = this.getToken();
    if (!token) return null;

    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.user) {
        this.setUser(data.user);
        return data.user;
      }
    } catch (err) {
      console.warn('Could not refresh profile:', err);
    }
    return this.getUser();
  },

  // -------------------------------------------------------------
  // Student Login Gateway Submission
  // -------------------------------------------------------------
  async handleStudentLogin(event) {
    if (event) event.preventDefault();

    const fullNameInput = document.getElementById('student-fullname');
    const emailInput = document.getElementById('student-email');
    const passwordInput = document.getElementById('student-password');
    const nidInput = document.getElementById('student-nid');
    const errorBox = document.getElementById('student-login-error');

    if (errorBox) {
      errorBox.style.display = 'none';
      errorBox.textContent = '';
    }

    const fullName = fullNameInput ? fullNameInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value.trim() : '';
    const nationalId = nidInput ? nidInput.value.trim() : '';

    if (!fullName || !email || !password) {
      const msg = 'يرجى إكمال جميع الحقول الإلزامية: الاسم بالكامل، البريد الإلكتروني، وكلمة المرور.';
      if (errorBox) {
        errorBox.textContent = msg;
        errorBox.style.display = 'block';
      }
      if (window.Accessibility) window.Accessibility.speak(msg);
      return;
    }

    if (nationalId && nationalId.length !== 14) {
      const msg = 'تنبيه: الرقم القومي يجب أن يتكون من 14 رقماً أو يمكنك تركه فارغاً حالياً.';
      if (errorBox) {
        errorBox.textContent = msg;
        errorBox.style.display = 'block';
      }
      if (window.Accessibility) window.Accessibility.speak(msg);
      return;
    }

    try {
      let data = null;
      try {
        const response = await fetch('/api/auth/student-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fullName, email, password, nationalId })
        });
        if (response.ok) {
          data = await response.json();
        } else if (response.status === 401 || response.status === 400) {
          data = await response.json();
        }
      } catch (netErr) {
        console.log('Backend not reachable, checking client credentials');
      }

      if (data) {
        if (data.success) {
          this.setUser(data.user, data.token);
          this.closeModal('student-gateway-modal');

          if (window.Accessibility) {
            window.Accessibility.announce(`مرحباً بك يا ${data.user.fullName}، تم تسجيل دخولك بنجاح.`);
            window.Accessibility.speak(`مرحباً بك يا ${data.user.fullName} في منصة بصيرة التعليمية للذكاء الاصطناعي.`);
          }

          if (window.App) {
            window.App.renderDashboard();
            window.App.navigate('dashboard');
          }
          return;
        } else {
          const errorMsg = data.message || 'بيانات الدخول غير صحيحة، يرجى المحاولة مجدداً.';
          if (errorBox) {
            errorBox.textContent = errorMsg;
            errorBox.style.display = 'block';
          }
          if (window.Accessibility) window.Accessibility.speak(errorMsg);
          return;
        }
      }

      // Standalone Fallback for Static CDN / Firebase Hosting
      if (password.trim() === '55555') {
        const localUser = {
          id: 'std-' + Date.now(),
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          nationalId: nationalId ? nationalId.trim() : null,
          role: 'student',
          xpPoints: 100,
          badges: ['شارة الانضمام', 'مستكشف بصيرة'],
          completedLessons: []
        };
        this.setUser(localUser, 'static-token-' + Date.now());
        this.closeModal('student-gateway-modal');

        if (window.Accessibility) {
          window.Accessibility.announce(`مرحباً بك يا ${localUser.fullName}، تم تسجيل دخولك بنجاح.`);
          window.Accessibility.speak(`مرحباً بك يا ${localUser.fullName} في منصة بصيرة التعليمية للذكاء الاصطناعي.`);
        }

        if (window.App) {
          window.App.renderDashboard();
          window.App.navigate('dashboard');
        }
      } else {
        const errorMsg = 'بيانات الدخول غير صحيحة. يرجى التحقق من صحة البريد الإلكتروني وكلمة المرور الموحدة والمحاولة مرة أخرى.';
        if (errorBox) {
          errorBox.textContent = errorMsg;
          errorBox.style.display = 'block';
        }
        if (window.Accessibility) window.Accessibility.speak(errorMsg);
      }
    } catch (err) {
      console.error('Login error:', err);
    }
  },

  // -------------------------------------------------------------
  // Admin Login Submission (المهندس محمد عاطف)
  // -------------------------------------------------------------
  async handleAdminLogin(event) {
    if (event) event.preventDefault();

    const emailInput = document.getElementById('admin-email');
    const passwordInput = document.getElementById('admin-password');
    const errorBox = document.getElementById('admin-login-error');

    if (errorBox) {
      errorBox.style.display = 'none';
      errorBox.textContent = '';
    }

    const email = emailInput ? emailInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';

    if (!email || !password) {
      const msg = 'يرجى إدخال البريد الإداري وكلمة المرور الخاصة بالمشرف العام.';
      if (errorBox) {
        errorBox.textContent = msg;
        errorBox.style.display = 'block';
      }
      return;
    }

    try {
      let data = null;
      try {
        const response = await fetch('/api/auth/admin-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        if (response.ok || response.status === 401 || response.status === 400) {
          data = await response.json();
        }
      } catch (netErr) {}

      if (data) {
        if (data.success) {
          this.setUser(data.user, data.token);
          this.closeModal('admin-login-modal');

          if (window.Accessibility) {
            window.Accessibility.announce('مرحباً بك يا باشمهندس محمد عاطف. تم فتح لوحة الإدارة الكاملة.');
            window.Accessibility.speak('مرحباً بك يا باشمهندس محمد عاطف، تم التحقق من هويتك الإدارية بنجاح.');
          }

          if (window.App) {
            window.App.renderAdminPanel();
            window.App.navigate('admin');
          }
          return;
        } else {
          const errorMsg = data.message || 'بيانات اعتماد المشرف العام غير صحيحة.';
          if (errorBox) {
            errorBox.textContent = errorMsg;
            errorBox.style.display = 'block';
          }
          if (window.Accessibility) window.Accessibility.speak(errorMsg);
          return;
        }
      }

      // Static fallback for Firebase Hosting
      if (email.trim().toLowerCase() === 'matf37920@gmail.com' && password === '2042005') {
        const adminUser = {
          id: 'admin-mohamed-atef',
          fullName: 'المهندس محمد عاطف',
          email: 'matf37920@gmail.com',
          role: 'admin',
          xpPoints: 9999,
          badges: ['المشرف العام', 'مؤسس المنصة', 'صلاحيات كاملة']
        };

        this.setUser(adminUser, 'static-admin-token-' + Date.now());
        this.closeModal('admin-login-modal');

        if (window.Accessibility) {
          window.Accessibility.announce('مرحباً بك يا باشمهندس محمد عاطف. تم فتح لوحة الإدارة الكاملة.');
          window.Accessibility.speak('مرحباً بك يا باشمهندس محمد عاطف، تم التحقق من هويتك الإدارية بنجاح.');
        }

        if (window.App) {
          window.App.renderAdminPanel();
          window.App.navigate('admin');
        }
      } else {
        const errorMsg = 'بيانات الاعتماد الإدارية غير صحيحة. لوحة التحكم مخصصة حصرياً للمشرف العام.';
        if (errorBox) {
          errorBox.textContent = errorMsg;
          errorBox.style.display = 'block';
        }
        if (window.Accessibility) window.Accessibility.speak(errorMsg);
      }
    } catch (err) {
      console.error('Admin login error:', err);
    }
  },

  // Audio Guide for Input Fields
  playInputGuide(fieldName) {
    if (!window.Accessibility) return;

    if (fieldName === 'student-gateway') {
      window.Accessibility.speak(
        'مرحباً بك في بوابة الدخول الميسرة لمنصة بصيرة. ' +
        'النموذج يتكون من أربعة حقول: أولاً الاسم بالكامل، ثانياً البريد الإلكتروني، ' +
        'ثالثاً كلمة المرور المشتركة للطلاب مع زر لإظهارها وإخفائها، ' +
        'ورابعاً الرقم القومي وهو اختياري لحفظ خصوصيتك أو لتوثيق شهادتك الرسمية.'
      );
    } else if (fieldName === 'student-password') {
      window.Accessibility.speak('حقل كلمة المرور المشتركة، يمكنك استخدام زر التبديل المجاور لإظهار الأحرف أثناء الكتابة أو إخفائها.');
    } else if (fieldName === 'national-id') {
      window.Accessibility.speak('حقل الرقم القومي المكون من 14 رقماً، وهو اختياري تماماً عند التسجيل، ويطلب فقط عند إصدار الشهادة الرسمية لحماية خصوصيتك.');
    }
  },

  togglePasswordVisibility(inputId, btnId) {
    const input = document.getElementById(inputId);
    const btn = document.getElementById(btnId);
    if (!input) return;

    if (input.type === 'password') {
      input.type = 'text';
      if (btn) btn.innerHTML = '<i class="fas fa-eye-slash" aria-hidden="true"></i><span class="sr-only">إخفاء كلمة المرور</span>';
      if (window.Accessibility) window.Accessibility.announce('تم إظهار كلمة المرور كنص صريح.');
    } else {
      input.type = 'password';
      if (btn) btn.innerHTML = '<i class="fas fa-eye" aria-hidden="true"></i><span class="sr-only">إظهار كلمة المرور</span>';
      if (window.Accessibility) window.Accessibility.announce('تم إخفاء كلمة المرور كنقاط مشفرة.');
    }
  },

  // Modal open & close helpers
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      const firstInput = modal.querySelector('input, button:not(.modal-close-btn)');
      if (firstInput) setTimeout(() => firstInput.focus(), 100);
      if (window.Accessibility) {
        window.Accessibility.announce('تم فتح نافذة منبثقة، استخدم مفتاح الهروب Escape أو زر الإغلاق للخروج.');
      }
    }
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
      if (window.Accessibility) window.Accessibility.announce('تم إغلاق النافذة.');
    }
  },

  // Update Header UI with current user stats
  updateHeaderProfile() {
    const user = this.getUser();
    const container = document.getElementById('header-auth-container');
    const adminNavLink = document.getElementById('nav-item-admin');

    if (!container) return;

    if (user) {
      const isSuper = user.role === 'admin';
      container.innerHTML = `
        <div class="user-badge" tabindex="0" aria-label="المستخدم الحالي: ${user.fullName}، الرصيد: ${user.xpPoints || 100} نقطة خبرة">
          <i class="fas ${isSuper ? 'fa-user-shield' : 'fa-user-graduate'}" style="color: var(--primary);" aria-hidden="true"></i>
          <span>${user.fullName}</span>
          <span class="xp-pill">${user.xpPoints || 100} XP</span>
          <button class="access-btn" onclick="Auth.logout()" title="تسجيل الخروج" aria-label="تسجيل الخروج من الحساب" style="padding: 0.2rem 0.5rem; margin-right: 0.25rem;">
            <i class="fas fa-sign-out-alt" aria-hidden="true"></i>
          </button>
        </div>
      `;

      if (adminNavLink) {
        adminNavLink.style.display = isSuper ? 'inline-flex' : 'none';
      }
    } else {
      container.innerHTML = `
        <button class="btn-primary" onclick="Auth.openModal('student-gateway-modal')" aria-label="تسجيل دخول الطالب">
          <i class="fas fa-sign-in-alt" aria-hidden="true"></i> دخول الطلاب
        </button>
        <button class="btn-admin" onclick="Auth.openModal('admin-login-modal')" title="بوابة الإدارة للمهندس محمد عاطف" aria-label="بوابة إدارة المنصة للمهندس محمد عاطف">
          <i class="fas fa-lock" aria-hidden="true"></i> المشرف العام
        </button>
      `;

      if (adminNavLink) {
        adminNavLink.style.display = 'none';
      }
    }
  }
};

window.Auth = Auth;
