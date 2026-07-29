import MentorMessaging from "@/components/messaging/MentorMessaging";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";

const Messages = () => {
  return (
    <div className="space-y-5 pb-3">
      <DashboardPageHeader
        eyebrow="Stay connected"
        title="Messages"
        description="Keep mentor conversations, feedback and next steps together after every session."
      />
      <div className="overflow-hidden rounded-[24px] border border-[#f0e2d7] bg-white p-1 shadow-[0_18px_55px_rgba(69,42,21,0.06)]">
        <MentorMessaging />
      </div>
    </div>
  );
};

export default Messages;
