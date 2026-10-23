import { useState } from 'react';
import axios from 'axios';
import { Mail, Loader2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

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
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your email and we&apos;ll notify the administrator to reset your password.
        </p>
      </div>

      {submitted ? (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300">
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
                className="block w-full rounded-xl border border-border bg-secondary/30 py-2.5 pl-10 pr-3 text-sm text-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="name@company.com"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
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
