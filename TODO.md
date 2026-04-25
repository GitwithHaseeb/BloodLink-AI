# BloodLink-AI Fix Plan

## Step 1: Data Persistence (store.js)
- [ ] Implement JSON file-based storage
- [ ] Add seed data generation for 50 donors & 20 hospitals

## Step 2: Backend Controllers
- [ ] Fix blood group matching to proper medical rules (donorController.js)
- [ ] Use store.js for data persistence in donorController.js
- [ ] Use store.js for data persistence in hospitalController.js
- [ ] Return proper HTTP status codes (404, 400, etc.)
- [ ] Fix name search to partial match (`.includes()`)
- [ ] Handle missing GROQ_API_KEY gracefully (chatController.js)

## Step 3: Middleware & Routes
- [ ] Add validateHospital middleware (auth.js)
- [ ] Apply rateLimiter and validateDonor to donorRoutes
- [ ] Apply rateLimiter and validateHospital to hospitalRoutes
- [ ] Apply rateLimiter to chatRoutes

## Step 4: App Setup
- [ ] Add global error handling middleware (app.js)
- [ ] Add request logging

## Step 5: Frontend
- [ ] Fix duplicate HTML IDs in index.html
- [ ] Add edit modals and buttons for donors/hospitals
- [ ] Fix script.js getElementById references
- [ ] Add try/catch to all API calls
- [ ] Implement editDonor() and editHospital()
- [ ] Rebuild donations table from backend data
- [ ] Add user feedback toasts

## Step 6: Project Config
- [ ] Create .gitignore

## Step 7: Testing
- [ ] Run npm start
- [ ] Test CRUD operations
- [ ] Test blood matching rules
- [ ] Test AI chat with/without API key
- [ ] Verify data persists after restart

