# Lead Details UI Improvements

## Current Issues
1. **Full-screen blocking loader** - Shows "Loading full details..." blocking entire view
2. **Complex conditional rendering** - Different layouts for call vs request vs consolidated leads
3. **No progressive loading** - All data must load before showing anything
4. **Hard to scan** - Information scattered across multiple columns

## Recommended Improvements

### 1. Progressive Loading (Immediate)
- ✅ Show lead header immediately (name, status, basic info)
- ✅ Use skeleton loaders for sections that are loading
- ✅ Load sections independently (conversation, messages, call history)
- ✅ Show what we have, load the rest in background

### 2. Tabbed Interface (Better Organization)
Organize content into clear tabs:
- **Overview** - Contact info, project description, AI summary, attachments
- **Conversation** - Live chat messages (if available)
- **Call History** - Transcripts and call records (if available)
- **Timeline** - Activity timeline (optional)

### 3. Skeleton States
Replace full-screen loader with section-specific skeletons:
```tsx
{loadingSections.conversation ? (
  <Skeleton className="h-64 w-full" />
) : (
  <ConversationMessages ... />
)}
```

### 4. Better Mobile Experience
- Use tabs on mobile (already responsive)
- Collapsible sections for long content
- Swipe gestures for navigation

### 5. Performance Optimizations
- Lazy load heavy components (transcripts, call history)
- Virtual scrolling for long message lists
- Memoize expensive renders

## Implementation Priority

1. **High Priority** (Do Now):
   - Progressive loading with skeletons
   - Show header immediately
   - Section-level loading states

2. **Medium Priority** (Next Sprint):
   - Tabbed interface
   - Better mobile layout
   - Lazy loading

3. **Low Priority** (Future):
   - Virtual scrolling
   - Timeline view
   - Advanced filtering

## Example Structure

```tsx
<Card>
  {/* Header - Always visible immediately */}
  <LeadHeader lead={lead} />
  
  {/* Tabs - Organize content */}
  <Tabs defaultValue="overview">
    <TabsList>
      <TabsTrigger value="overview">Overview</TabsTrigger>
      <TabsTrigger value="conversation">Messages</TabsTrigger>
      <TabsTrigger value="history">Call History</TabsTrigger>
    </TabsList>
    
    <TabsContent value="overview">
      {/* Contact, Description, Summary, Attachments */}
      {loadingSections.overview ? <Skeleton /> : <OverviewContent />}
    </TabsContent>
    
    <TabsContent value="conversation">
      {loadingSections.messages ? <Skeleton /> : <ConversationMessages />}
    </TabsContent>
    
    <TabsContent value="history">
      {loadingSections.callHistory ? <Skeleton /> : <CallHistory />}
    </TabsContent>
  </Tabs>
</Card>
```

