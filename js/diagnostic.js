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
    let totalScore = 0;

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
      const isMultiple = !!question.allowMultiple;

      let html = `
        <div class="diagnostic-progress-bar" role="progressbar" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100">
          <div class="diagnostic-progress-fill" style="width: ${progress}%"></div>
        </div>
        <div class="diagnostic-question-wrapper fade-in">
          <p class="diagnostic-step">Pregunta ${currentQuestionIndex + 1} de ${diagnosticData.questions.length} ${isMultiple ? '(Selección Múltiple)' : ''}</p>
          <h4 class="diagnostic-question-text">${escapeHtml(question.questionText)}</h4>
          <div class="diagnostic-options ${isMultiple ? 'diagnostic-options-multiple' : ''}">
      `;

      if (isMultiple) {
        html += question.options.map((opt, idx) => `
          <label class="diagnostic-option-label">
            <input type="checkbox" class="diagnostic-option-checkbox" data-index="${idx}">
            <span class="diagnostic-option-text">${escapeHtml(opt.label)}</span>
          </label>
        `).join('');
        html += `</div>
          <button class="btn btn-primary diagnostic-next-btn" style="margin-top: 24px; width: 100%;">Siguiente pregunta</button>
        </div>`;
      } else {
        html += question.options.map((opt, idx) => `
          <button class="diagnostic-option-btn" data-index="${idx}">
            ${escapeHtml(opt.label)}
          </button>
        `).join('');
        html += `</div></div>`;
      }

      quizContainer.innerHTML = html;

      if (isMultiple) {
        const nextBtn = quizContainer.querySelector('.diagnostic-next-btn');
        const checkboxes = quizContainer.querySelectorAll('.diagnostic-option-checkbox');
        
        nextBtn.addEventListener('click', () => {
          checkboxes.forEach(cb => {
            if (cb.checked) {
              const idx = parseInt(cb.getAttribute('data-index'));
              const selectedOption = question.options[idx];
              totalScore += (selectedOption.points || 0);

              if (window.posthog) {
                window.posthog.capture('diagnostic_answer', {
                  diagnostic_title: diagnosticData.title,
                  question: question.questionText,
                  answer: selectedOption.label
                });
              }
            }
          });
          currentQuestionIndex++;
          renderQuestion();
        });
      } else {
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

            totalScore += (selectedOption.points || 0);

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
    }

    function finishDiagnostic() {
      const progressHtml = `
        <div class="diagnostic-progress-bar">
          <div class="diagnostic-progress-fill" style="width: 100%"></div>
        </div>
      `;
      quizContainer.innerHTML = progressHtml;

      const results = diagnosticData.results || [];
      // Find the result where totalScore falls in the range
      let result = results.find(r => totalScore >= (r.minScore || 0) && totalScore <= (r.maxScore || 1000));
      
      // Default to first result if no match is found for some reason
      if (!result) result = results[0];

      if (window.posthog) {
        window.posthog.capture('diagnostic_completed', {
          diagnostic_title: diagnosticData.title,
          result_title: result?.title,
          total_score: totalScore
        });
      }

      showResultModal(result);
    }

    function showResultModal(result) {
      if (!result) return;
      
      let dialog = document.getElementById('diagnostic-result-modal');
      if (!dialog) {
        dialog = document.createElement('dialog');
        dialog.id = 'diagnostic-result-modal';
        dialog.className = 'diagnostic-modal';
        document.body.appendChild(dialog);
      }

      // Si el usuario no puso icono, usamos un SVG premium por defecto.
      // Si el usuario puso un emoji, lo mostramos, pero le diremos que lo saque.
      const defaultIcon = `<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" style="color: var(--color-primary);"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path><path d="m9 12 2 2 4-4"></path></svg>`;
      const icon = result.icon || defaultIcon;
      const ctaText = result.ctaText || 'Consultar ahora';
      
      let waLink = '#';
      if (result.ctaWhatsApp) {
        const floatWA = document.getElementById('whatsapp-float');
        const phone = floatWA ? floatWA.getAttribute('data-phone') : '5493512050889';
        // Add total score context to whatsapp message
        const msg = encodeURIComponent(result.ctaWhatsApp + ` (Mi puntaje en el diagnóstico fue: ${totalScore} pts)`);
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
        currentQuestionIndex = 0;
        totalScore = 0;
        renderQuestion();
      });

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
