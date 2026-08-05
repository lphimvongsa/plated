# plated. — Product Specification & Frontend Prototype Guide

**Version:** 1.0  
**Date:** August 5, 2026  
**Project type:** Responsive, installable web application  
**Initial phase:** Frontend prototype with mocked AI behavior  
**Primary stack:** Next.js, TypeScript, Tailwind CSS, Supabase, Vercel

---

## 1. Product Overview

**plated.** is a collaborative dinner-party planning web app for casual, self-taught, and experienced home cooks. It should remain approachable to beginners while offering enough structure and control for users who already know how to plan and execute complex meals.

The app helps users move from an initial dinner-party concept to a complete, actionable plan:

1. Create a party
2. Set theme, cuisine, service style, courses, allergies, and preferences
3. Build the menu
4. Scale recipes and generate a shopping list
5. Assign tasks and generate a dependency-aware timeline
6. Invite guests
7. Adjust the plan as guests RSVP or party details change

Users must create an account before planning. A party can have multiple managers and editors, making it suitable for both personal use and collaborative hosting.

---

## 2. Brand and Visual Direction

### 2.1 Brand Name

**plated.**

The period is part of the brand name and should be used consistently in logos, page titles, navigation, and marketing copy.

### 2.2 Overall Aesthetic

The visual language should combine:

- Disposable-camera photography
- Warm, social, candid dinner-party imagery
- Vintage editorial layouts
- Clean, modern interface text
- Playful typography
- A mixture of serif, sans-serif, display, and handwritten-style fonts
- Cream and off-white backgrounds
- Warm red, orange, and deep brown or black accents
- Asymmetric compositions
- Strong headline typography
- Magazine-like spacing and image placement
- Subtle grain, flash photography, and imperfect analog texture

The marketing and invitation surfaces should feel expressive and editorial.

The application dashboard should be cleaner and easier to scan, while retaining visual interest through typography, photography, texture, cards, labels, stamps, and occasional editorial layouts.

### 2.3 Photography Direction

The app should be dominated by disposable-camera-style photography, including:

- Full dinner-party scenes
- Guests socializing
- Flash photography
- Tables filled with dishes
- Plates in progress
- Finished dishes
- Cooking and prep moments
- Wine, flowers, candles, and table settings
- Candid rather than highly polished studio imagery

User-provided stock photography will be supplied before implementation. Supplemental stock imagery may be used where necessary.

### 2.4 Typography Direction

Typography should mix multiple families, inspired by the first visual reference:

- Editorial serif for major headings
- Clean sans-serif for interface copy and forms
- Bold display type for playful campaign-style moments
- Handwritten or script accents used sparingly
- Condensed or uppercase labels for metadata and navigation

Typography must remain legible and accessible, especially in planning and task-management screens.

---

## 3. Target Users

### Primary audience

- Casual home cooks
- Self-taught cooks
- Social hosts
- People with moderate cooking experience
- Groups planning collaborative dinner parties

### Secondary audience

- Beginner hosts
- More advanced home cooks
- Supper-club organizers
- Small private dining groups
- Friends co-hosting events

The product should feel capable without feeling overly professional or intimidating.

---

## 4. Authentication and Accounts

Users must have an account before creating or planning a party.

### Required authentication methods

- Email and password
- Google authentication

### Account-level preferences

During onboarding, users should be able to set:

- Preferred measurement system:
  - US customary
  - Metric
- Pantry staples that usually remain available:
  - Salt
  - Pepper
  - Common seasonings
  - Oils
  - Sauces
  - Other user-selected staples
- Default timezone
- Optional cooking skill level
- Optional cooking specialties
- Notification preferences

### Collaboration roles

A party may contain multiple users with different permissions:

- Owner
- Manager
- Editor
- Helper
- Guest

Suggested permission model:

| Role | Manage party | Edit menu | Edit timeline | Assign tasks | Invite guests | Mark tasks complete |
|---|---:|---:|---:|---:|---:|---:|
| Owner | Yes | Yes | Yes | Yes | Yes | Yes |
| Manager | Yes | Yes | Yes | Yes | Yes | Yes |
| Editor | Limited | Yes | Yes | Limited | No | Yes |
| Helper | No | No | No | No | No | Assigned tasks only |
| Guest | No | No | No | No | No | No |

Exact role permissions can be refined during backend implementation.

---

## 5. Core User Flow

### Step 1: Create Party

The host creates a new party and enters:

- Party name
- Date
- Start time
- Location
- Expected guest count
- Co-hosts or collaborators
- Optional cover image
- Optional notes

### Step 2: Set Direction

The host defines:

- Theme
- Cuisine
- Menu structure
- Number of courses
- Dietary preferences
- Known allergies
- Restrictions
- Dress code
- Suggested guest contributions
- Desired mood or vibe
- Planning timeframe

### Step 3: Build Menu

The host adds recipes from:

- Saved cookbook
- Recipe URL import
- Plain-text paste
- PDF upload
- Image upload
- Manual entry

The menu is assembled before invitations are sent so guests can preview it.

### Step 4: Scale and Shop

The app:

- Scales recipe portions to the party size
- Converts measurements
- Consolidates ingredients
- Checks pantry selections
- Generates a categorized grocery list
- Estimates costs
- Calculates total and per-person cost

### Step 5: Plan Execution

The app:

- Extracts recipe tasks
- Detects dependencies
- Builds a timeline
- Considers prep and cook durations
- Considers available helpers
- Assigns tasks based on skill and workload
- Allows manual assignment and task locking

### Step 6: Invite Guests

The host sends email or SMS invitations linking to a custom invite page.

Guests can:

- Preview the menu
- RSVP
- Add allergies
- Add dietary preferences
- View dress code
- View suggested items to bring
- View event details

### Step 7: Adjust Dynamically

As guests RSVP or details change, the app should update:

- Party size
- Recipe scaling
- Shopping list
- Cost estimates
- Allergy warnings
- Timeline
- Task assignments

---

## 6. Party Dashboard

Each party should have a central dashboard with an at-a-glance summary.

### Dashboard sections

- Party header
- Countdown
- Guest status
- Menu status
- Allergy alerts
- Shopping progress
- Estimated cost
- Actual spend
- Timeline status
- Task completion
- Collaborators
- Quick actions
- Recent changes

### Suggested top-level party navigation

- Overview
- Menu
- Recipes
- Guests
- Shopping
- Timeline
- Tasks
- Costs
- Settings

On mobile, this should collapse into a bottom navigation bar or compact menu.

---

## 7. Recipe Import and Cookbook

### 7.1 Import Methods

Users can create recipes by:

- Pasting a recipe URL
- Pasting plain text
- Uploading a PDF
- Uploading an image
- Entering the recipe manually

### 7.2 Storage Rules

- Preserve the original URL when a recipe is imported from a URL
- Do not retain uploaded PDFs or source images after recipe extraction
- Store only the extracted and user-approved recipe data
- Allow users to edit all extracted fields before saving

### 7.3 Recipe Fields

Each recipe should support:

- Title
- Description
- Image
- Source URL
- Author or source name
- Servings
- Prep time
- Cook time
- Total time
- Difficulty
- Cuisine
- Course
- Dietary tags
- Allergy tags
- Ingredients
- Measurements
- Instructions
- Required equipment
- Make-ahead notes
- Storage notes
- Reheating notes
- Personal notes
- Pantry flags

### 7.4 Ingredient Fields

Each ingredient should support:

- Name
- Quantity
- Unit
- Preparation note
- Optional group or section
- Pantry status
- Allergy status
- Substitution status
- Estimated unit cost
- Actual receipt cost

### 7.5 Cookbook Organization

Users can create custom cookbook sections or collections, such as:

- Appetizers
- Mains
- Desserts
- Weeknight favorites
- Dinner-party recipes
- Italian
- Summer
- Tested recipes
- Recipes to try

Users should be able to search, filter, sort, and favorite recipes.

---

## 8. Measurement Conversion and Scaling

### 8.1 Measurement Preferences

Users choose a preferred default system:

- US customary
- Metric

All recipes should display in the selected system by default.

### 8.2 Conversion

Users should be able to convert:

- A single recipe
- A single ingredient
- An entire menu
- The complete grocery list

Conversion should account for:

- Volume
- Weight
- Temperature where applicable
- Common cooking units
- Practical rounding

### 8.3 Portion Scaling

Recipes should scale based on:

- Party guest count
- Whether hosts and helpers are included
- Menu structure
- Number of courses
- User-entered serving override

The app should preserve sensible units and avoid impractical values where possible.

---

## 9. Pantry Management

### 9.1 Persistent Pantry Staples

During onboarding, users can select stable items they generally keep available:

- Seasonings
- Dry spices
- Oils
- Vinegars
- Sauces
- Condiments
- Baking staples
- Other custom staples

These do not require quantity tracking in the first version.

### 9.2 Party-Specific Pantry Check

When creating a party, the app asks users which relevant ingredients they currently have.

Users select items without initially entering exact quantities.

After the menu and grocery list are generated, the app asks the user to confirm whether they have enough of each selected item.

### 9.3 First-Version Limitations

The first version does not need to:

- Automatically reduce pantry inventory after a party
- Track expiration dates
- Persist exact quantities for volatile ingredients
- Fully reconcile household inventory across parties

---

## 10. Allergies and Substitutions

### 10.1 Allergy Detection

Known guest and party allergies should be compared against all menu ingredients.

When a recipe contains an allergen:

- Show a bright warning banner at the top of the recipe
- Highlight the specific ingredient
- Identify which guest or guests are affected
- Show the warning in the menu overview
- Show a warning before invitations are finalized

### 10.2 Substitution Workflow

Substitutions are generated only when the user explicitly requests them.

Users can request a substitution by:

- Clicking an ingredient
- Clicking an allergy warning
- Clicking a recipe-level “Find replacements” action

### 10.3 Substitution Constraints

Suggested substitutions should:

- Avoid drastic changes to the recipe’s cooking process
- Preserve flavor and texture where possible
- Account for quantity changes
- Explain important tradeoffs
- Prioritize pantry ingredients when relevant
- Respect allergies and dietary preferences

AI substitution behavior will be mocked in the frontend prototype.

---

## 11. Menu Builder

### 11.1 Supported Menu Structures

- Family style
- Buffet
- Plated courses
- Cocktail party
- Potluck
- Tasting menu

### 11.2 Menu Builder Features

- Add recipes from cookbook
- Import recipes directly
- Drag and reorder courses
- Create course sections
- Add non-recipe items
- Mark drinks
- Mark guest-contributed items
- Set serving style
- Preview guest-facing menu
- Flag incomplete courses
- Show allergy conflicts
- Show estimated total prep time
- Show estimated menu cost

### 11.3 AI Menu Analysis

Users can explicitly run a mocked AI analysis that checks for:

- Oven conflicts
- Burner conflicts
- Equipment conflicts
- Repeated ingredients
- Repeated flavors
- Repeated textures
- Timing bottlenecks
- Too many last-minute dishes
- Missing menu balance
- Dependency risks

Automatic menu generation is not required in the first version.

Preset menu structures should guide users without generating a complete menu.

---

## 12. Theme and Guest Experience

Party setup should support:

- Theme
- Cuisine
- Dress code
- Mood
- Color direction
- Suggested items to bring
- Wine or drink notes
- Music notes
- Table-setting notes
- Host message

Relevant information should appear on the guest invitation page.

---

## 13. Guest Management and Invitations

### 13.1 Invitations

The first functional version should support:

- Real email invitations
- Real SMS invitations
- A custom invitation page for each party

Potential later integrations:

- Resend for email
- Twilio for SMS

### 13.2 Guest Invitation Page

The invitation page should include:

- Party name
- Date and time
- Location
- Host names
- Disposable-camera-style hero image
- Theme
- Dress code
- Menu preview
- Suggested items to bring
- RSVP controls
- Allergy form
- Dietary preference form
- Optional guest note
- Contact host action

### 13.3 RSVP Statuses

- Attending
- Maybe
- Not attending
- No response

### 13.4 Guest Adjustments

As RSVP information changes, the system should recalculate:

- Guest count
- Serving quantities
- Shopping quantities
- Cost
- Allergy warnings
- Timeline workload
- Task assignments where necessary

---

## 14. Shopping List

### 14.1 Generation

The app should combine ingredients from every menu recipe into one shopping list.

### 14.2 Organization

Items should be grouped by ingredient category, such as:

- Produce
- Meat and seafood
- Dairy and eggs
- Bakery
- Pantry
- Spices
- Frozen
- Beverages
- Specialty
- Other

### 14.3 Features

- Consolidate duplicate ingredients
- Show total required quantity
- Show source recipes
- Mark as already owned
- Confirm whether pantry quantity is sufficient
- Mark as purchased
- Add manual items
- Remove or edit items
- Show estimated cost
- Show actual cost
- Filter by store or category later

---

## 15. Cost Calculator

### 15.1 Estimates

AI-mocked cost estimates should calculate an estimated unit cost for each ingredient.

Estimated cost should:

- Multiply by scaled quantity
- Decrease when items are marked as already owned
- Update when guest count changes
- Update when recipes change

### 15.2 Cost Views

Display:

- Total estimated party cost
- Total actual spend
- Estimated cost per guest
- Actual cost per guest
- Cost per dish
- Cost by ingredient category

### 15.3 Cost Splitting

Users can choose:

- Include or exclude the host
- Include or exclude helpers
- Split across attending guests
- Enter a manual number of people

---

## 16. Receipt Upload

Users can upload a receipt image or document.

The system should extract:

- Store
- Date
- Line items
- Item prices
- Tax
- Discounts
- Total amount

The app should attempt to:

- Match receipt items to grocery-list items
- Update actual spend
- Show unmatched items
- Allow manual corrections

The frontend prototype should mock receipt extraction and matching.

Source receipt files do not need to be retained after extraction in the first version unless required for implementation.

---

## 17. Timeline Generation

### 17.1 Timeline Inputs

The timeline should consider:

- Party date and start time
- User-entered planning timeframe
- Recipe prep time
- Recipe cook time
- Make-ahead steps
- Cooling, chilling, proofing, resting, marinating, or reheating
- Equipment constraints
- Task dependencies
- Number of helpers
- Helper availability
- Helper skill levels
- Manual task locks

### 17.2 Dynamic Behavior

The timeline should automatically update when:

- Party time changes
- Guest count changes
- Menu changes
- A task is delayed
- A user reports a task incomplete
- A helper becomes unavailable
- A dependency changes

### 17.3 Check-Ins

The app should periodically ask whether key tasks were completed.

When the user says no:

- Recalculate affected tasks
- Surface risks
- Move dependent tasks
- Suggest recovery actions
- Preserve locked tasks where possible

For the prototype, these behaviors can be simulated with preset states.

---

## 18. Tasks and Delegation

### 18.1 Helper Skill Levels

- Beginner
- Intermediate
- Advanced

### 18.2 Helper Specialties

Examples:

- Knife work
- Baking
- Grilling
- Sauces
- Pastry
- Plating
- Bartending
- Timing and coordination
- Table setup
- Cleaning
- Shopping

### 18.3 Automatic Delegation

Automatic assignment should consider:

- Skill level
- Specialty
- Workload
- Task difficulty
- Timing conflicts
- Dependencies
- Availability

### 18.4 Manual Control

Hosts can:

- Assign tasks manually
- Reassign tasks
- Lock tasks
- Unlock tasks
- Regenerate only unassigned or unlocked tasks
- Mark tasks complete
- Override completion status

### 18.5 Helper Experience

Helpers with accounts who are collaborators can:

- View assigned tasks
- View task instructions
- View deadlines
- Mark tasks complete in real time
- Add notes

Helpers without accounts should receive assignments by email.

---

## 19. Notifications

Potential notifications include:

- Invitation received
- RSVP submitted
- Allergy added
- Task assigned
- Task due soon
- Timeline changed
- Party time changed
- Shopping item assigned
- Collaborator added
- Menu updated

Frontend prototype notifications should be represented in an in-app inbox.

---

## 20. Mobile and Installable App Behavior

The application must have complete desktop and mobile views.

It should also function as an installable Progressive Web App.

### PWA requirements

- Web app manifest
- App icons
- Installable on supported devices
- Standalone display mode
- Mobile-safe navigation
- Responsive layouts
- Touch-friendly controls
- Basic offline shell where practical
- Appropriate theme color and splash behavior

The goal is for users to add plated. to their home screen and use it like a native app.

---

## 21. Recommended Frontend Architecture

### Framework

- Next.js App Router
- TypeScript
- Tailwind CSS

### Suggested supporting libraries

- shadcn/ui or custom accessible components
- Lucide icons
- React Hook Form
- Zod
- Zustand or React Context for prototype state
- dnd-kit for drag-and-drop
- date-fns
- Framer Motion for restrained transitions
- next-pwa or equivalent PWA configuration
- Recharts only where cost visualization benefits from it

### Backend planned for later

- Supabase Auth
- Supabase Postgres
- Supabase Storage only where needed
- Supabase Realtime for collaborative tasks
- Vercel deployment
- Resend for email
- Twilio for SMS
- AI provider for parsing, analysis, substitution, cost estimation, and scheduling

---

## 22. Suggested Route Structure

```text
/
  marketing landing page

/auth
  /login
  /signup
  /forgot-password

/onboarding
  /preferences
  /pantry
  /profile

/app
  dashboard
  /parties
  /recipes
  /cookbook
  /pantry
  /inbox
  /settings

/app/parties/[partyId]
  overview
  menu
  recipes
  guests
  shopping
  timeline
  tasks
  costs
  settings

/invite/[inviteToken]
  custom guest invitation and RSVP page
```

---

## 23. Suggested Data Model

### User

- id
- name
- email
- avatar
- preferred measurement system
- timezone
- cooking skill level
- specialties
- onboarding status

### Party

- id
- owner id
- name
- description
- date
- start time
- location
- timezone
- theme
- cuisine
- menu structure
- dress code
- guest contribution notes
- hero image
- status

### Party Member

- party id
- user id
- role
- skill level
- specialties
- availability

### Guest

- id
- party id
- name
- email
- phone
- RSVP status
- allergies
- dietary preferences
- plus-one count
- notes

### Recipe

- id
- owner id
- title
- description
- image
- source URL
- servings
- prep time
- cook time
- course
- cuisine
- tags
- instructions
- equipment
- notes

### Ingredient

- id
- recipe id
- name
- quantity
- unit
- preparation note
- category
- allergen tags
- pantry flag

### Cookbook Collection

- id
- owner id
- name
- description

### Menu Item

- id
- party id
- recipe id
- course
- order
- serving override
- guest-visible status

### Grocery Item

- id
- party id
- ingredient name
- required quantity
- unit
- category
- already owned
- enough confirmed
- purchased
- estimated cost
- actual cost

### Task

- id
- party id
- title
- description
- start time
- due time
- duration
- status
- difficulty
- required specialty
- assigned user
- locked
- dependency ids

### Receipt

- id
- party id
- store
- date
- subtotal
- tax
- total

### Receipt Item

- id
- receipt id
- description
- quantity
- price
- matched grocery item id

---

## 24. Frontend Prototype Scope

The first deliverable should be a polished, responsive frontend prototype.

### Include

- Marketing landing page
- Login and signup screens
- Onboarding flow
- App dashboard
- Party creation flow
- Party overview
- Theme and menu setup
- Recipe cookbook
- Recipe import modal
- Recipe detail and edit screens
- Menu builder
- Allergy warnings
- Pantry-selection flow
- Grocery list
- Cost dashboard
- Guest management
- Custom invitation page
- RSVP flow
- Timeline
- Task assignment
- Helper view
- Notification inbox
- Responsive mobile layouts
- Installable PWA setup
- Mock AI actions and states
- Mock receipt extraction
- Mock invitation-send interactions

### Mocked interactions

- Recipe URL parsing
- PDF and image extraction
- AI substitutions
- AI cost estimation
- AI kitchen analysis
- AI task generation
- AI delegation
- AI timeline regeneration
- Receipt OCR and matching
- Email sending
- SMS sending
- Realtime collaboration

Mocked features should look and behave convincingly enough for product testing.

---

## 25. Functionality Remaining After Frontend Prototype

The following work will remain after the frontend prototype:

### Authentication and accounts

- Supabase Auth implementation
- Google OAuth
- Email verification
- Password reset
- Session management
- Role permissions

### Database and persistence

- Supabase schema
- Database migrations
- Row-level security
- Party persistence
- Recipe persistence
- Guest persistence
- Pantry persistence
- Task persistence
- Cost persistence

### Collaboration

- Realtime updates
- Concurrent editing
- Presence indicators
- Conflict handling
- Activity history
- Permission enforcement

### Recipe extraction

- URL parser
- Plain-text parser
- PDF extraction
- Image extraction
- Validation and normalization
- Source attribution
- Temporary upload deletion

### AI services

- Ingredient normalization
- Unit conversion validation
- Allergy detection
- Substitution generation
- Cost estimation
- Menu analysis
- Timeline generation
- Dependency extraction
- Task delegation
- Delay recovery

### Invitations

- Resend integration
- Twilio integration
- Secure invite tokens
- Delivery tracking
- RSVP persistence
- Reminder workflows

### Receipts

- OCR
- Item extraction
- Grocery matching
- Actual cost reconciliation
- Error correction flow

### PWA production hardening

- Offline strategy
- Caching
- Push notifications
- Background sync where supported
- Device testing

### Quality and operations

- Automated tests
- Accessibility audit
- Analytics
- Error tracking
- Performance optimization
- Privacy policy
- Terms of service
- Data deletion
- Security review

---

## 26. Accessibility Requirements

Even with an expressive editorial style, the app should maintain:

- Sufficient text contrast
- Keyboard navigation
- Visible focus states
- Semantic HTML
- Form labels
- Error messaging
- Screen-reader-friendly controls
- Reduced-motion support
- Large mobile touch targets
- Allergy warnings that do not rely on color alone

---

## 27. Responsive Design Principles

### Desktop

- Editorial split layouts
- Large photography
- Multi-column planning views
- Persistent party navigation
- Drag-and-drop menu and task interfaces
- Sidebar or secondary panels where useful

### Mobile

- Bottom navigation
- Stacked cards
- Full-screen editors and modals
- Sticky primary actions
- Swipe-friendly task and shopping interactions
- Simplified timeline visualization
- One-handed task completion
- Fast access to today’s tasks and shopping list

---

## 28. Initial Design System Direction

### Colors

Exact colors should be finalized after reviewing the supplied stock photography.

Starting direction:

- Warm cream background
- Soft paper white
- Tomato red
- Burnt orange
- Deep espresso
- Muted olive
- Dusty pink
- Occasional cobalt or wine accent

### Surfaces

- Paper-like cards
- Thin borders
- Slightly irregular image crops
- Soft shadows used sparingly
- Photo overlays
- Stamp, ticket, or label motifs
- Handwritten annotations used sparingly

### Motion

- Gentle page transitions
- Small hover shifts
- Image reveal effects
- Drag feedback
- Timeline movement
- Avoid excessive animation

---

## 29. Open Decisions Before Full Implementation

These are not blockers for the design prototype, but should be resolved before backend implementation:

1. Final production email provider
2. Final SMS provider
3. Whether guests can RSVP without creating an account
4. Whether guest invitation pages are public-token pages or require verification
5. Whether collaborators can invite additional collaborators
6. Whether owners can transfer ownership
7. Whether imported recipe images may be retained
8. Whether receipt files should be retained temporarily or deleted immediately
9. Whether exact pantry quantities will be supported later
10. Whether push notifications are required in the first production release
11. Whether parties can be duplicated
12. Whether past parties become an archive or remain editable
13. Whether guests can bring plus-ones
14. Whether collaborators can chat inside a party
15. Whether shopping items can be assigned to specific people
16. Whether invite pages need password protection
17. Whether custom domains or branded invite links are needed later

---

## 30. Next Implementation Step

Before frontend implementation begins:

1. Receive the user-provided stock photography
2. Review and categorize the images
3. Establish the final visual system
4. Define font pairings
5. Build the responsive landing page
6. Build the app shell and party dashboard
7. Implement the full prototype flow using mocked data
8. Test desktop and mobile layouts
9. Add PWA configuration
10. Deliver a summary of remaining backend functionality

---

## 31. Product Principle

plated. should not feel like project-management software with food added to it.

It should feel like a beautiful dinner-party companion: expressive when inspiring the host, structured when execution matters, and social throughout the entire experience.
