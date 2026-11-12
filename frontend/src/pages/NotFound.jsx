import { Link } from 'react-router-dom';
import { Home, ArrowLeft, Ghost } from '@/components/ui/muiIcons';

const NotFound = () => {
  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-background text-center px-6">
      <div className="relative mb-8">
        <h1 className="text-[12rem] font-black tracking-tighter text-secondary leading-none select-none">404</h1>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <Ghost size={120} className="text-primary animate-bounce" />
        </div>
      </div>
      
      <h2 className="text-3xl font-bold tracking-tight mb-2">Lost in space?</h2>
      <p className="text-muted-foreground max-w-md mb-8">
        The page you're looking for doesn't exist or has been moved to another quadrant of the agency.
      </p>
      
      <div className="flex items-center space-x-4">
        <button 
          onClick={() => window.history.back()}
          className="flex items-center px-6 py-3 border border-border rounded-2xl font-bold hover:bg-secondary transition-all"
        >
          <ArrowLeft size={18} className="mr-2" />
          Go Back
        </button>
        <Link 
          to="/"
          className="flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-2xl font-bold shadow-sm hover:bg-primary/90 transition-all"
        >
          <Home size={18} className="mr-2" />
          Dashboard
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
