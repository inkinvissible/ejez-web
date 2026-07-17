document.addEventListener('DOMContentLoaded', () => {
  const containers = document.querySelectorAll('.article-diagnostic');

  containers.forEach(container => {
    const dataRaw = container.getAttribute('data-diagnostic');
    if (!dataRaw) return;

    let diagnosticData;
    try {
      diagnosticData = JSON.parse(dataRaw);
    } catch (e) {
      console.error('Failed to parse diagnostic data', e);
      return;
    }

    const introEl = container.querySelector('.diagnostic-intro');
    const startBtn = container.querySelector('.diagnostic-btn-start');
    const quizContainer = container.querySelector('.diagnostic-quiz-container');

    let currentQuestionIndex = 0;
    let scores = {}; // resultKey -> total points

    startBtn.addEventListener('click', () => {
      if (window.posthog) {
        window.posthog.capture('diagnostic_started', {
          diagnostic_title: diagnosticData.title,
          diagnostic_slug: diagnosticData.slug?.current || diagnosticData.slug
        });
      }
      introEl.style.display = 'none';
      quizContainer.style.display = 'block';
      renderQuestion();
    });

    function renderQuestion() {
      if (currentQuestionIndex >= diagnosticData.questions.length) {
        finishDiagnostic();
        return;
      }

      const question = diagnosticData.questions[currentQuestionIndex];
      const progress = ((currentQuestionIndex) / diagnosticData.questions.length) * 100;

      const html = `
        <div class="diagnostic-progress-bar" role="progressbar" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100">
          <div class="diagnostic-progress-fill" style="width: ${progress}%"></div>
        </div>
        <div class="diagnostic-question-wrapper fade-in">
          <p class="diagnostic-step">Pregunta ${currentQuestionIndex + 1} de ${diagnosticData.questions.length}</p>
          <h4 class="diagnostic-question-text">${escapeHtml(question.questionText)}</h4>
          <div class="diagnostic-options">
            ${question.options.map((opt, idx) => `
              <button class="diagnostic-option-btn" data-index="${idx}">
                ${escapeHtml(opt.label)}
              </button>
            `).join('')}
          </div>
        </div>
      `;

      quizContainer.innerHTML = html;

      const optionBtns = quizContainer.querySelectorAll('.diagnostic-option-btn');
      optionBtns.forEach(btn => {
        btn.addEventListener('click', function() {
          const idx = parseInt(this.getAttribute('data-index'));
          const selectedOption = question.options[idx];

          if (window.posthog) {
            window.posthog.capture('diagnostic_answer', {
              diagnostic_title: diagnosticData.title,
              question: question.questionText,
              answer: selectedOption.label
            });
          }

          // Accumulate scores
          if (selectedOption.scores) {
            selectedOption.scores.forEach(s => {
              scores[s.resultKey] = (scores[s.resultKey] || 0) + s.points;
            });
          }

          // Visual feedback
          this.classList.add('selected');
          optionBtns.forEach(b => b.disabled = true);

          setTimeout(() => {
            currentQuestionIndex++;
            renderQuestion();
          }, 300);
        });
      });
    }

    function finishDiagnostic() {
      const progressHtml = `
        <div class="diagnostic-progress-bar">
          <div class="diagnostic-progress-fill" style="width: 100%"></div>
        </div>
      `;
      quizContainer.innerHTML = progressHtml;

      // Determine result
      let winningKey = null;
      let maxPoints = -1;
      
      for (const [key, pts] of Object.entries(scores)) {
        if (pts > maxPoints) {
          maxPoints = pts;
          winningKey = key;
        }
      }

      const results = diagnosticData.results || [];
      // Default to first result if no winner
      const result = results.find(r => r.key === winningKey) || results[0];

      if (window.posthog) {
        window.posthog.capture('diagnostic_completed', {
          diagnostic_title: diagnosticData.title,
          result_key: result?.key,
          result_title: result?.title
        });
      }

      showResultModal(result);
    }

    function showResultModal(result) {
      if (!result) return;
      
      // Check if dialog exists, else create it
      let dialog = document.getElementById('diagnostic-result-modal');
      if (!dialog) {
        dialog = document.createElement('dialog');
        dialog.id = 'diagnostic-result-modal';
        dialog.className = 'diagnostic-modal';
        document.body.appendChild(dialog);
      }

      const icon = result.icon || '🎯';
      const ctaText = result.ctaText || 'Consultar ahora';
      
      // WhatsApp link generator
      let waLink = '#';
      if (result.ctaWhatsApp) {
        // Find float WA button for phone number if possible, or fallback to standard EjeZ number
        const floatWA = document.getElementById('whatsapp-float');
        const phone = floatWA ? floatWA.getAttribute('data-phone') : '5493512050889';
        const msg = encodeURIComponent(result.ctaWhatsApp);
        waLink = `https://wa.me/${phone}?text=${msg}`;
      }

      dialog.innerHTML = `
        <div class="diagnostic-modal-content">
          <button class="diagnostic-modal-close" aria-label="Cerrar modal">&times;</button>
          <div class="diagnostic-result-icon">${icon}</div>
          <h3 class="diagnostic-result-title">${escapeHtml(result.title)}</h3>
          ${result.description ? `<p class="diagnostic-result-description">${escapeHtml(result.description)}</p>` : ''}
          <div class="diagnostic-result-actions">
            <a href="${waLink}" class="btn btn-primary" target="_blank" rel="noopener noreferrer">${escapeHtml(ctaText)}</a>
            <button class="btn btn-outline diagnostic-modal-restart">Rehacer diagnóstico</button>
          </div>
        </div>
      `;

      dialog.showModal();

      dialog.querySelector('.diagnostic-modal-close').addEventListener('click', () => {
        dialog.close();
      });

      dialog.querySelector('.diagnostic-modal-restart').addEventListener('click', () => {
        dialog.close();
        // Reset state
        currentQuestionIndex = 0;
        scores = {};
        renderQuestion();
      });

      // Close on backdrop click
      dialog.addEventListener('click', (e) => {
        const dialogDimensions = dialog.getBoundingClientRect();
        if (
          e.clientX < dialogDimensions.left ||
          e.clientX > dialogDimensions.right ||
          e.clientY < dialogDimensions.top ||
          e.clientY > dialogDimensions.bottom
        ) {
          dialog.close();
        }
      });
    }

    function escapeHtml(value) {
      return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }
  });
});
