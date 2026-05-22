# Hanova

A modern luxury web app with Firebase Authentication, subscription plans, Zaad payment flow, and an AI assistant.

## Features

- **Splash screen** — Welcome message with 6-second intro
- **Firebase Auth** — Sign Up / Log In with Gmail and password
- **Plans** — Free ($0), Basic ($0.99), Plus ($1.5), Premium ($2)
- **Payment** — Zaad USSD code `2200633718556*amount#` to +252633718556
- **AI Assistant** — Free: photo & text file uploads (20/day). Premium: typed chat + unlimited uploads
- **History** — Saved interactions
- **Settings** — Profile, Privacy & Policy, Log Out

## Credits

**Hanova** — Developed for MHHS GAME INC  
**Powered by MHHS GAME INC**

## Run Locally

Open `index.html` in a browser, or serve with any static server:

```bash
npx serve .
```

### Firebase setup (required for Sign Up / Log In)

1. Open [Firebase Console → hanova-fe572](https://console.firebase.google.com/project/hanova-fe572/authentication/providers)
2. **Authentication** → **Sign-in method** → enable **Email/Password** → Save
3. **Authentication** → **Settings** → **Authorized domains** → add:
   - `localhost` (for local testing)
   - `hanadmahdi66-dotcom.github.io` (if using GitHub Pages)

Do **not** open `index.html` by double-clicking (file://). Use a server or GitHub Pages:

```bash
npx serve .
```

## Files

| File | Purpose |
|------|---------|
| `index.html` | App structure and screens |
| `style.css` | Luxury UI styling |
| `app.js` | Firebase Auth and app logic |

## Tech Stack

- HTML5, CSS3, JavaScript (ES modules)
- Firebase Authentication (CDN v10)
