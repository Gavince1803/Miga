# Miga

Miga is a React Native mobile application built with Expo, designed specifically for bakers to manage their orders, recipes, inventory, and schedule. It provides a comprehensive set of tools to streamline operations for baking businesses.

## Features

- **Order Management**: Track customer orders, delivery dates, and status.
- **Recipe Book**: Store and organize recipes.
- **Calendar & Scheduling**: View upcoming orders and tasks on a calendar.
- **Inventory Tracking**: Basic tools to keep an eye on your stock.
- **Premium Features**: In-app subscriptions powered by RevenueCat.
- **AI Integration**: Powered by Gemini API to assist with baking-related tasks (like receipt OCR).

## Tech Stack

- **Framework**: [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/)
- **Backend & Database**: [Supabase](https://supabase.com/)
- **In-App Purchases**: [RevenueCat](https://www.revenuecat.com/)
- **Navigation**: Expo Router
- **UI & Styling**: Built using standard React Native elements and specific Expo packages.

## Getting Started

### Prerequisites

- Node.js installed
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI for builds (`npm install -g eas-cli`)
- A Supabase project
- A RevenueCat account
- A Gemini API key

### Installation

1. Clone the repository
   ```bash
   git clone <repository-url>
   cd agenda-repostera
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Configure Environment Variables
   Create a `.env` file in the root directory by copying the example file:
   ```bash
   cp .env.example .env
   ```
   
   Fill in your `.env` file with the appropriate keys:
   ```
   EXPO_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
   EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
   EXPO_PUBLIC_GEMINI_API_KEY=YOUR_GEMINI_API_KEY
   EXPO_PUBLIC_REVENUECAT_IOS_KEY=YOUR_REVENUECAT_IOS_KEY
   EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=YOUR_REVENUECAT_ANDROID_KEY
   ```

### Running the App Locally

To start the development server:
```bash
npx expo start
```
You can then open the app on your physical device using the Expo Go app, or on an iOS Simulator/Android Emulator.

## Building for Production

Use Expo Application Services (EAS) to build the app for production. 

```bash
eas build --profile production --platform all
```

**Note:** Ensure that all environment variables including Supabase keys are securely added to your EAS project secrets before building. Do not hardcode secrets in `eas.json` or commit your `.env` file.
