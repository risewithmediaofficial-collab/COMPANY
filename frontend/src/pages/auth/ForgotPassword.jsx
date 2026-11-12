import { useState } from 'react';
import axios from 'axios';
import { Mail, Loader2, ArrowLeft } from '@/components/ui/muiIcons';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post('/api/auth/forgot-password', { email });
      setSubmitted(true);
      toast.success(response.data.message || 'Password reset request sent to the administrator');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send reset request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Reset your password</h2>
      </div>

      {submitted ? (
        <div className="rounded-xl bg-secondary p-4 text-sm text-foreground">
          Your password reset request has been sent to the administrator.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="ml-1 text-sm font-medium text-foreground">
              Email address
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                <Mail size={18} />
              </div>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="block w-full rounded-xl bg-background py-2.5 pl-10 pr-3 text-sm text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-brand/40"
                placeholder="name@company.com"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Submit Request'}
          </button>
        </form>
      )}

      <Link to="/login" className="inline-flex items-center text-sm font-medium text-primary hover:underline">
        <ArrowLeft size={16} className="mr-2" />
        Back to login
      </Link>
    </div>
  );
};

export default ForgotPassword;
