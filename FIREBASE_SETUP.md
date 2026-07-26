# Firebase Setup Guide — Reviews & Partners System

Follow this once, in order. Takes about 15-20 minutes. Nothing on the live
site will work (reviews, partners, admin login) until you complete this.

---

## 1. Create the Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** → name it anything (e.g. `mobashir-website`) → you can disable Google Analytics for this project, not needed → **Create project**

## 2. Register a Web App

1. On the project home screen, click the **`</>`** (web) icon
2. Nickname it anything (e.g. `mobashir-site`) → **Register app**
3. You'll see a code block with a `firebaseConfig` object — **copy this whole object**, you'll need it in Step 5

## 3. Enable Firestore Database

1. Left sidebar → **Build → Firestore Database** → **Create database**
2. Choose a location close to your audience (any is fine) → **Standard edition**
3. Start in **Production mode** (we'll paste real security rules next, so this is safe)

## 4. Enable Authentication (this is what protects your admin dashboard)

1. Left sidebar → **Build → Authentication** → **Get started**
2. Under **Sign-in method**, enable **Email/Password**
3. Go to the **Users** tab → **Add user** → enter the email and password YOU will use to log into `admin.html`
   - This is the only account that will ever be able to log in — write this password down somewhere safe, there's no "forgot password" flow set up

## 5. Add your config to the site

Open `firebase-config.js` in your project files. Replace the placeholder object with the real one you copied in Step 2:

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

Save and upload this file to your GitHub repo (overwrites the placeholder version).

## 6. Set Firestore Security Rules (important — do not skip)

1. In Firestore Database, go to the **Rules** tab
2. Replace everything with this:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Reviews: anyone can submit a new review (status locked to "pending"
    // by rule below), but only approved+non-hidden ones can be publicly
    // read in list form via the query the site uses. Only a signed-in
    // admin can update or delete.
    match /reviews/{reviewId} {
      allow read: if resource.data.status == 'approved' && resource.data.hidden == false;
      allow read: if request.auth != null; // admin can read everything
      allow create: if request.resource.data.status == 'pending'
                    && request.resource.data.hidden == false
                    && request.resource.data.pinned == false
                    && request.resource.data.rating is int
                    && request.resource.data.rating >= 1
                    && request.resource.data.rating <= 5
                    && request.resource.data.name is string
                    && request.resource.data.message is string;
      allow update, delete: if request.auth != null;
    }

    // Partners: publicly readable if visible, fully managed by admin only.
    match /partners/{partnerId} {
      allow read: if resource.data.visible == true;
      allow read: if request.auth != null;
      allow create, update, delete: if request.auth != null;
    }

    // Contacts: anyone can submit an inquiry (contact form, booking-modal
    // quick form, or exit-intent checklist form) — but submissions are
    // write-only for the public. Only the signed-in admin can ever read,
    // update (e.g. mark as read), or delete them.
    match /contacts/{contactId} {
      allow create: if request.resource.data.message is string
                    && request.resource.data.read == false;
      allow read, update, delete: if request.auth != null;
    }
  }
}
```

3. Click **Publish**

This does exactly what you asked for: anyone can submit a review, but it's
locked to `pending` status the moment it's created — nothing becomes public
until you personally approve it in `admin.html`. Only your logged-in admin
account can approve, reject, edit, delete, hide, or pin anything.

## 7. Test it

1. Upload all the files (see the main file list) to your repo
2. Visit your live site, scroll to the **Client Reviews** section, submit a test review
3. Go to `yoursite.com/admin.html`, log in with the email/password from Step 4
4. You should see your test review under the **Pending** tab — click **Approve**
5. Refresh your homepage — the review should now appear publicly

## Notes

- **Free tier limits:** Firebase's free (Spark) plan includes 50K reads and 20K writes per day — far more than a consultant site will ever use.
- **The `firebaseConfig` values are not secret.** They're meant to be visible in client-side code. Your actual security comes from the Firestore Rules in Step 6 and the Authentication in Step 4 — not from hiding these values.
- **Losing the admin password:** since there's no password-reset flow wired up, if you forget it, go to Firebase Console → Authentication → Users → find your account → you can reset the password directly there.
- **Adding a second admin later:** just add another user in Authentication → Users. Both would be able to log into `admin.html`.
