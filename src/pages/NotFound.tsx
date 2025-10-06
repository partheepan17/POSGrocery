import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-primary-500">404</h1>
        <p className="mt-4 text-xl text-gray-600">Page Not Found</p>
        <p className="mt-2 text-gray-500">The page you're looking for doesn't exist.</p>
        <Link 
          to="/" 
          className="mt-8 inline-flex items-center rounded-md bg-primary-500 px-6 py-3 text-lg text-white hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          Go to Home
        </Link>
      </div>
    </div>
  );
}









