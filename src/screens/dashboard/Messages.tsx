import MentorMessaging from "@/components/messaging/MentorMessaging";

const Messages = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Messages</h1>
        <p className="text-muted-foreground">
          Chat with your mentors after paid sessions
        </p>
      </div>
      <MentorMessaging />
    </div>
  );
};

export default Messages;
