import { useState } from 'react';
import { MessageCircle, Phone, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function SupportButton() {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const supportNumber = '914-300-4674';

  const handleSupportClick = () => {
    // Check if mobile device
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
      // Open SMS on mobile
      window.location.href = `sms:${supportNumber}`;
    } else {
      // Copy to clipboard on desktop
      navigator.clipboard.writeText(supportNumber).then(() => {
        setCopied(true);
        toast({
          title: "Phone number copied!",
          description: `${supportNumber} has been copied to your clipboard`,
        });
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {
        toast({
          title: "Support Number",
          description: supportNumber,
          variant: "default",
        });
      });
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-40">
      <Button
        onClick={handleSupportClick}
        className="bg-blue-500 hover:bg-blue-600 text-white rounded-full p-2 sm:p-3 shadow-lg minecraft-support-btn"
        size="sm"
      >
        {copied ? (
          <Check className="w-3 h-3 sm:w-4 sm:h-4" />
        ) : (
          <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4" />
        )}
      </Button>
    </div>
  );
}