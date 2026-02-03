# LifeLog Integration for choreo-your-AI-work-journal

Add habit tracking and wellness insights to boost user productivity. Help users track focus time, breaks, and daily goals.

## Quick Start

### 1. Install the SDK

```bash
npm install @lifelog/sdk
# or
yarn add @lifelog/sdk
```

### 2. Set up your API key (optional)

```bash
# .env
LIFELOG_API_KEY=your_api_key  # Optional - works in local-only mode too
```

### 3. Import and use

```typescript
import { onTaskComplete, updateProductivityGoal } from './lifelog-integration';

// Log when a user completes something
await onTaskComplete({ id: 'task-1', title: 'Deployed smart contract' });

// Track goal progress
await updateProductivityGoal(180, 240); // 3 hours of 4 hour goal
```

## Integration Ideas for choreo-your-AI-work-journal

Log task completions as check-ins, track daily goal progress, add streak bonuses

### Suggested Integration Points


- **Task completion**: Call `onTaskComplete()` when users finish tasks
- **Focus sessions**: Use `logFocusSession()` for Pomodoro/deep work
- **Daily goals**: Track with `updateProductivityGoal()`
- **Break reminders**: Log healthy breaks with `logBreak()`







## $LIFE Token Rewards

Users earn $LIFE tokens for completing wellness activities:

| Action | Reward |
|--------|--------|
| Complete daily goal | 100 $LIFE |
| Complete weekly goal | 500 $LIFE |
| Achievement unlocked | 50+ $LIFE |
| Milestone reached | 200 $LIFE |
| Streak bonus | 50 $LIFE/day |

## Features

- 📊 **Local-first**: All data stored locally by default
- 🔐 **Privacy-focused**: No cloud sync unless you want it
- 💰 **$LIFE rewards**: Earn tokens for healthy habits
- 🤖 **AI insights**: Get personalized coaching (coming soon)
- 📱 **Cross-platform**: Works in Node.js, browsers, and React Native

## API Reference

See the full [@lifelog/sdk documentation](https://github.com/0xrichyrich/lifelog-agent/tree/main/sdk#readme).

## Questions?

- GitHub: [0xrichyrich/lifelog-agent](https://github.com/0xrichyrich/lifelog-agent)
- Issues: [Report a bug](https://github.com/0xrichyrich/lifelog-agent/issues)

---

Built with ❤️ by the LifeLog team for the hackathon community.
