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

Enable **Email/Password** sign-in in [Firebase Console](https://console.firebase.google.com/) → Authentication → Sign-in method.

## Files

| File | Purpose |
|------|---------|
| `index.html` | App structure and screens |
| `style.css` | Luxury UI styling |
| `app.js` | Firebase Auth and app logic |

## Tech Stack

- HTML5, CSS3, JavaScript (ES modules)
- Firebase Authentication (CDN v10)
