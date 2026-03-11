import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { HelpCircle, BookOpen, MessageCircle, Mail, ExternalLink } from "lucide-react";

export default function Help() {
  const resources = [
    {
      icon: BookOpen,
      title: "Documentation",
      description: "Learn how to use the warehouse enrollment system",
      href: "#"
    },
    {
      icon: MessageCircle,
      title: "Live Chat",
      description: "Get help from our support team in real-time",
      href: "#"
    },
    {
      icon: Mail,
      title: "Email Support",
      description: "Send us a message at support@ink.com",
      href: "mailto:support@ink.com"
    }
  ];

  const faqs = [
    {
      question: "How do I enroll an NFC sticker?",
      answer: "Navigate to the Enroll section, select an order, then follow the prompts to scan the sticker, capture photos, and complete the enrollment."
    },
    {
      question: "What if the NFC scan fails?",
      answer: "Ensure the sticker is placed close to your device's NFC reader. Most phones have the reader near the top or center back. Try repositioning and scanning again."
    },
    {
      question: "How do I view my tag inventory?",
      answer: "Go to Settings > Tag Inventory to see your current stock, usage, and utilization metrics."
    }
  ];

  return (
    <AppLayout>
      <div className="px-4 py-6 max-w-2xl mx-auto">
        <PageHeader title="Help & Support" />

        {/* Quick Links */}
        <div className="space-y-3 mb-8">
          {resources.map((resource) => {
            const Icon = resource.icon;
            return (
              <a
                key={resource.title}
                href={resource.href}
                className="flex items-center gap-4 bg-card border border-border rounded-2xl p-4 hover:bg-secondary/30 transition-colors group"
              >
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                  <Icon size={20} className="text-muted-foreground" strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{resource.title}</p>
                  <p className="text-xs text-muted-foreground">{resource.description}</p>
                </div>
                <ExternalLink size={16} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            );
          })}
        </div>

        {/* FAQs */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <HelpCircle size={20} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Frequently Asked Questions</span>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="border-b border-border pb-4 last:border-0 last:pb-0">
                <p className="font-medium text-sm mb-1">{faq.question}</p>
                <p className="text-sm text-muted-foreground">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}