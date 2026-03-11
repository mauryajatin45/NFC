import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useEffect, useState } from "react";

interface PageHeaderProps {
  title: string;
}

export function PageHeader({ title }: PageHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    // Check if there's history to go back to
    // history.length > 2 because: 1 = initial blank, 2 = first real page
    setCanGoBack(window.history.length > 2);
  }, [location]);

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="flex items-center gap-2 mb-6">
      {canGoBack && (
        <button
          onClick={handleBack}
          className="p-1 -ml-1 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Go back"
        >
          <ChevronLeft size={20} />
        </button>
      )}
      <h1 className="font-heading text-2xl font-medium">{title}</h1>
    </div>
  );
}
