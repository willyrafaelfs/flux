# Flux — Smart Finance AI Dashboard

![Flux Dashboard Banner](public/dashboard.png)

**Flux** is a professional, privacy-first personal finance management platform built with Next.js 15 and Google's powerful Gemini AI. It transforms the way you manage receipts and track spending by leveraging AI vision and decentralized storage.

## ✨ Key Features

-   **🤖 AI Vision Engine**: Automatically extract merchant names, dates, categories, and total amounts from receipt photos using Google Gemini 2.0 Flash with human-level accuracy.
-   **🔐 Privacy-First Architecture**: Your financial data never touches an external database. Everything is synced and stored directly in your private **Google Drive** (`Flux_Receipts` folder).
-   **📊 Visual Intelligence**: Interactive daily trends, monthly summaries, and category distribution charts built with Recharts.
-   **📅 Historical Reporting**: Easily switch between months and years to analyze your long-term financial health.
-   **💡 Smart Insights**: Real-time AI-generated tips and budget warnings based on your spending habits.
-   **💎 Premium UI**: A state-of-the-art "Glassmorphism 2.0" design with fluid animations and a specialized dark mode aesthetic.

## 🚀 Tech Stack

-   **Framework**: [Next.js 15+](https://nextjs.org/) (App Router)
-   **AI Engine**: [Google Generative AI (Gemini)](https://ai.google.dev/)
-   **Authentication**: [NextAuth.js](https://next-auth.js.org/) (Google OAuth)
-   **Storage**: [Google Drive API](https://developers.google.com/drive) (Hidden App Data / drive.file)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **Data Vis**: [Recharts](https://recharts.org/)

## 🛠️ Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/willyrafaelfs/flux.git
cd flux
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Setup
Create a `.env.local` file in the root directory and add the following keys:

```env
# Google OAuth (for Login & Drive)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Google Gemini API (for Receipt Scanning)
GEMINI_API_KEY=your_gemini_api_key

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=a_random_secure_string_for_session_encryption
```

### 4. Run Development Server
```bash
npm run dev
```

## 🛡️ Privacy & Security

Flux is built on the principle of **Zero-Server Storage**.
1.  **Authentication**: Handled securely via Google OAuth.
2.  **AI Processing**: Images are processed temporarily and are not stored in any external cloud storage other than your own Google Drive.
3.  **Data Sovereignity**: You own your data. If you delete your Google Drive folder, all transaction history is gone—Flux does not keep a backup.

## 👨‍💻 Developer

**Willy Rafael**  
[willy.rafaelfs@gmail.com](mailto:willy.rafaelfs@gmail.com)

---
*Built with ❤️ [Willy](https://github.com/willyrafaelfs)*
