# Klar

Для того чтобы нейросеть (например, Claude, GPT-4 или специализированный разработчик на базе ИИ) выдала тебе качественный код или детальный прототип, промпт должен быть на английском языке — это международный стандарт разработки.

Вот мощный, структурированный промпт для создания твоего приложения KLAR.

🚀 Prompt for KLAR: Telegram Mini App Development
Role: You are an expert Full-stack Developer and UI/UX Designer specializing in Telegram Mini Apps (TMA) and Educational Platforms (EdTech).

Project Goal: Build a sleek, high-performance Telegram Web App named "KLAR" for learning German. The name "KLAR" stands for clarity, simplicity, and efficiency.

1. Visual Identity & UX
Design Philosophy: Minimalist, clean, and professional.

Color Palette: Deep Navy Blue, Crisp White, and a soft Accent Yellow (modern German aesthetic).

User Interface: Use a bottom navigation bar or a simple grid dashboard. It must feel like a native mobile app.

Feedback: Integrate Telegram Haptic Feedback (vibration) for correct/incorrect answers.

2. Core Functional Modules (MVP)
Level Selector: A clean menu to choose between levels: A1, A2, B1, B2.

Learning Categories: Each level should contain:

Wortschatz (Vocabulary): Flashcard-style learning with progress tracking.

Grammatik (Grammar): Bite-sized theory followed by interactive multiple-choice tests.

Lesen (Reading): Short stories/texts with "fill-in-the-blank" or comprehension questions.

Exercise Engine: Create reusable components for:

Multiple choice questions.

Matching pairs (German-Russian).

Sentence reordering (Drag and drop).

3. Admin & Content Management (The "Edit" Feature)
CMS Interface: I need a simple, password-protected Admin Panel or a JSON-based structure that allows me to:

Add/Edit/Delete vocabulary lists.

Update grammar rules and test questions.

Upload new texts without rewriting the core code.

4. Technical Stack Requirements
Frontend: React.js or Vue.js with Vite for speed.

State Management: Securely store user progress (local storage or database integration like Supabase/Firebase).

Telegram Integration: Use @telegram-apps/sdk for seamless integration with the Telegram interface (closing button, back button, theme colors).

5. Task
Please provide:

The Application Architecture (How to structure the files).

A Basic Boilerplate Code for the Main Screen and one Exercise Module.

A Mock Schema for the JSON database that will hold the lessons.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://klardeutsch.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/91effce9-96a1-482e-a51a-f7567fdb9bfa).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
