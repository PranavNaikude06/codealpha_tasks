# Frontend Client

This folder contains the client-side of the Nexus application. It is constructed as a multi-page web interface using vanilla HTML, vanilla JavaScript, CSS, and Tailwind CSS. All communications with the backend REST API are processed asynchronously using dynamic HTTP `fetch` requests.

## File Structure

- `index.html`: Main user home feed (shows followed users' posts, post creation form, side navigation panel).
- `explore.html`: Discovery feed (shows all posts published on the platform and a listing of users to follow).
- `profile.html`: Dynamic user profile page showing user details, post counts, followers, followed users, and user posts.
- `edit_profile.html`: Profile editing page allowing users to update their bio and avatar image URL.
- `login.html`: User account login page.
- `register.html`: User account registration page.
- `post.html`: Single post detail page presenting the post body and chronological comment feed with add/delete options.
- `api.js`: Standard client-side helper library encapsulating server-side REST API calls, localStorage state management (for auth tokens), and relative date-time format conversions.

## Configuration

The REST API base URL is specified at the top of `api.js`:
```js
const API_BASE = 'http://127.0.0.1:3000/api';
```

## Authentication State

- JWT Token: Saved in `localStorage` as `nexus_token` and sent in the `Authorization: Bearer <token>` HTTP request headers.
- User details: Stored in `localStorage` as `nexus_user` (serialized JSON string).
