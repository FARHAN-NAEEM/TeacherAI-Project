import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [message, setMessage] = useState('');
  
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('Checking credentials...');

    try {
      const response = await fetch('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage('✅ Login Successful! Redirecting...');
        
        // টোকেন খোঁজার জন্য সব ধরনের সম্ভাব্য জায়গা চেক করা হচ্ছে
        // যেহেতু আপনার ব্যাকএন্ডে TransformInterceptor আছে, তাই এটি result.data এর ভেতর থাকবে
        const token = result.access_token || 
                      result.token || 
                      result.accessToken || 
                      result.data?.access_token || 
                      result.data?.token;

        if (token) {
          localStorage.setItem('teacherToken', token);
          console.log("Token successfully stored in LocalStorage!");
        } else {
          console.error("Backend returned success, but no token found in:", result);
        }

        setTimeout(() => {
          navigate('/dashboard');
        }, 1000);

      } else {
        const errorMsg = Array.isArray(result.message) ? result.message[0] : result.message;
        setMessage(`❌ Error: ${errorMsg || 'Invalid email or password'}`);
      }
    } catch (error) {
      console.error('Login Error:', error);
      setMessage('❌ Server connection failed.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <h2 className="text-3xl font-bold text-center text-blue-600 mb-2">TeacherAI</h2>
        <p className="text-center text-gray-500 mb-8">Login to your account</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 font-medium mb-1">Email Address</label>
            <input 
              type="email" 
              name="email"
              value={formData.email}
              onChange={handleChange}
              required 
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
              placeholder="teacher@example.com" 
            />
          </div>
          <div>
            <label className="block text-gray-700 font-medium mb-1">Password</label>
            <input 
              type="password" 
              name="password"
              value={formData.password}
              onChange={handleChange}
              required 
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
              placeholder="••••••••" 
            />
          </div>
          <button type="submit" className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition duration-300 cursor-pointer">
            Login
          </button>
        </form>

        {message && (
          <div className={`mt-4 text-center font-medium p-3 rounded ${message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {message}
          </div>
        )}

        <p className="text-center text-gray-600 mt-6 font-medium">
          Don't have an account? <Link to="/register" className="text-blue-600 font-bold hover:underline">Register here</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;