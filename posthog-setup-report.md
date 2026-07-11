# PostHog post-wizard report

The wizard has completed a full PostHog integration of the EJEZ website. The PostHog analytics snippet was added to all 9 HTML source pages (homepage, 4 service pages, 3 case study pages, and the inefficiency calculator). Event tracking was instrumented in the two main JavaScript files (`js/script.js` and `js/calculadora.js`), and page-specific funnel events were added via inline scripts in the service and case study pages. Environment variables were written to `.env`.

| Event name | Description | File |
|---|---|---|
| `whatsapp_contact_submitted` | User submits the WhatsApp contact form on the homepage | `js/script.js` |
| `hero_cta_clicked` | User clicks a hero section CTA button (schedule consultation or view case studies) | `js/script.js` |
| `architecture_sprint_cta_clicked` | User clicks the "Agendar Sprint de Arquitectura" CTA | `js/script.js` |
| `whatsapp_float_clicked` | User clicks the floating WhatsApp button (visible after scrolling) | `js/script.js` |
| `service_card_expanded` | User expands a service card on mobile to read full details | `js/script.js` |
| `project_tab_switched` | User switches between project category tabs in the portfolio section | `js/script.js` |
| `faq_item_opened` | User opens an FAQ item to read the answer | `js/script.js` |
| `calculator_result_calculated` | User has entered data into the inefficiency calculator and received a meaningful result | `js/calculadora.js` |
| `case_study_viewed` | User views a case study page (EcoRise, Discor, or Ramayón House) | `casos/*.html` |
| `service_page_viewed` | User views a service page, indicating interest in that service | `servicios/*.html` |

## Next steps

We've built some insights and a dashboard to keep an eye on user behavior, based on the events we just instrumented:

- [Analytics basics (wizard) — Dashboard](https://us.posthog.com/project/507073/dashboard/1831302)
- [WhatsApp contact form submissions](https://us.posthog.com/project/507073/insights/sE6znW4z)
- [Hero CTA clicks by label](https://us.posthog.com/project/507073/insights/jwMgKmjQ)
- [Case study to contact funnel](https://us.posthog.com/project/507073/insights/RaVxN2B4)
- [Service page views by service](https://us.posthog.com/project/507073/insights/chiY5fAP)
- [Architecture Sprint CTA clicks](https://us.posthog.com/project/507073/insights/rCZyAiOh)

## Verify before merging

- [ ] Run a full production build (the wizard only verified the files it touched) and fix any lint or type errors introduced by the generated code.
- [ ] Run the test suite — call sites that were rewritten or instrumented may need updated mocks or fixtures.
- [ ] Add `POSTHOG_PROJECT_TOKEN` and `POSTHOG_HOST` to `.env.example` (or equivalent) and any bootstrap scripts so collaborators know what to set.

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.
