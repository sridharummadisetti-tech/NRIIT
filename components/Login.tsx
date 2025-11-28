

import React, { useState, FormEvent, useEffect, useRef } from 'react';
import { Role } from '../types';

interface LoginProps {
  onLogin: (rollNumber: string, password: string, department: string, role: Role) => 'SUCCESS' | 'WRONG_DEPARTMENT' | 'INVALID_CREDENTIALS';
  onCheckEmailExists: (email: string) => boolean;
  onResetPassword: (email: string, newPass: string) => boolean;
  departments: string[];
  onBiometricLogin: () => Promise<'SUCCESS' | 'NOT_FOUND' | 'ERROR'>;
}

const themes = {
  'ECE': {
    logo: 'text-blue-500',
    button: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
    input: 'focus:ring-blue-500 focus:border-blue-500',
  },
  'EVT': {
    logo: 'text-green-500',
    button: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
    input: 'focus:ring-green-500 focus:border-green-500',
  },
  'CSE': {
    logo: 'text-indigo-500',
    button: 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500',
    input: 'focus:ring-indigo-500 focus:border-indigo-500',
  },
  'AIML': {
    logo: 'text-purple-500',
    button: 'bg-purple-600 hover:bg-purple-700 focus:ring-purple-500',
    input: 'focus:ring-purple-500 focus:border-purple-500',
  },
  'IT': {
    logo: 'text-sky-500',
    button: 'bg-sky-600 hover:bg-sky-700 focus:ring-sky-500',
    input: 'focus:ring-sky-500 focus:border-sky-500',
  },
  'DSD': {
    logo: 'text-orange-500',
    button: 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500',
    input: 'focus:ring-orange-500 focus:border-orange-500',
  },
  'CIVIL': {
    logo: 'text-slate-500',
    button: 'bg-slate-600 hover:bg-slate-700 focus:ring-slate-500',
    input: 'focus:ring-slate-500 focus:border-slate-500',
  },
  'SUPER_ADMIN': {
    logo: 'text-red-500',
    button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    input: 'focus:ring-red-500 focus:border-red-500',
  }
};

const AnimatedNriitTitle: React.FC<{ colorClass: string }> = ({ colorClass }) => (
    <div className={`nriit-3d-text ${colorClass}`}>
      <span>N</span>
      <span>R</span>
      <span>I</span>
      <span>I</span>
      <span>T</span>
    </div>
);

const Login: React.FC<LoginProps> = ({ onLogin, onCheckEmailExists, onResetPassword, departments, onBiometricLogin }) => {
  const [rollNumber, setRollNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(departments[0]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState<'input' | 'otp' | 'reset' | 'success'>('input');
  const [recoveryInput, setRecoveryInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [forgotPasswordError, setForgotPasswordError] = useState('');
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const [cardStyle, setCardStyle] = useState({});

  useEffect(() => {
    // Check if WebAuthn is supported
    if (window.PublicKeyCredential && 
        window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
        window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then(available => {
            setIsBiometricSupported(available);
        });
    }
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!cardRef.current) return;
      const { left, top, width, height } = cardRef.current.getBoundingClientRect();
      const x = e.clientX - left;
      const y = e.clientY - top;
      const rotateX = -((y - height / 2) / (height / 2)) * 8; // Max rotation 8deg
      const rotateY = ((x - width / 2) / (width / 2)) * 8;
      setCardStyle({
          transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`,
          transition: 'transform 0.1s ease-out'
      });
  };

  const handleMouseLeave = () => {
      setCardStyle({
          transform: 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)',
          transition: 'transform 0.5s ease-in-out'
      });
  };

  const handleButtonMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    button.style.setProperty('--mouse-x', `${x}px`);
    button.style.setProperty('--mouse-y', `${y}px`);
  };


  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!selectedRole) return;
    const result = onLogin(rollNumber, password, selectedDepartment, selectedRole);
    
    if (result === 'INVALID_CREDENTIALS') {
      let idType = 'credentials';
      if (selectedRole === Role.STAFF) idType = 'Staff ID or password';
      if (selectedRole === Role.STUDENT) idType = 'Roll Number or password';
      if (selectedRole === Role.SUPER_ADMIN) idType = 'Username or password';
      setError(`Invalid ${idType}.`);
    } else if (result === 'WRONG_DEPARTMENT') {
      setError('Login failed. Please select the correct department for this user.');
    }
  };

  const handleBiometricClick = async () => {
      setError('');
      const result = await onBiometricLogin();
      if (result === 'NOT_FOUND') {
          setError('No fingerprint/Face ID found for this device. Please login with password and enable it in settings.');
      } else if (result === 'ERROR') {
          setError('Biometric authentication failed or cancelled.');
      }
  };
  
  const handleResetPasswordSubmit = () => {
    setForgotPasswordError('');
    if (newPassword !== confirmNewPassword) {
      setForgotPasswordError('Passwords do not match.');
      return;
    }
    if (!newPassword) {
        setForgotPasswordError('Password cannot be empty.');
        return;
    }

    const success = onResetPassword(recoveryInput, newPassword);

    if (success) {
      setForgotPasswordStep('success');
    } else {
      setForgotPasswordStep('input');
      setForgotPasswordError('An error occurred. Please try again.');
    }
  };

  const handleEmailCheckSubmit = () => {
    setForgotPasswordError('');
    if (!recoveryInput) {
        setForgotPasswordError('Please enter your registered email address.');
        return;
    }
    
    const emailExists = onCheckEmailExists(recoveryInput);

    if (emailExists) {
      setForgotPasswordStep('otp');
    } else {
      setForgotPasswordError('No account found with this Email Address.');
    }
  };
  
  const handleOtpVerification = () => {
    setForgotPasswordError('');
    // For demo purposes, any 6-digit code is accepted.
    if (otpInput.match(/^\d{6}$/)) {
        setForgotPasswordStep('reset');
    } else {
        setForgotPasswordError('Invalid OTP. Please enter the 6-digit code.');
    }
  };


  const activeTheme = themes[selectedDepartment as keyof typeof themes] || themes['ECE'];
  const adminTheme = themes['SUPER_ADMIN'];

  const handleCloseForgotPassword = () => {
    setShowForgotPasswordModal(false);
    setTimeout(() => {
        setForgotPasswordStep('input');
        setRecoveryInput('');
        setOtpInput('');
        setNewPassword('');
        setConfirmNewPassword('');
        setForgotPasswordError('');
    }, 300);
  };


  const renderForgotPasswordModal = () => (
    showForgotPasswordModal && (
        <div className="fixed inset-0 flex justify-center items-center z-50 anim-modal-backdrop">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md anim-modal-content">
                <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white text-center">
                    {forgotPasswordStep === 'input' && 'Reset Password'}
                    {forgotPasswordStep === 'otp' && 'Verify Your Identity'}
                    {forgotPasswordStep === 'reset' && 'Set New Password'}
                    {forgotPasswordStep === 'success' && 'Password Reset'}
                </h2>
                {forgotPasswordError && <p className="text-sm text-red-500 text-center mb-4">{forgotPasswordError}</p>}
                
                {forgotPasswordStep === 'input' && (
                    <>
                        <p className="text-gray-600 dark:text-gray-400 mb-4 text-center">
                            Please enter your registered Email Address to receive an OTP.
                        </p>
                        <input
                            type="email" required
                            className={`appearance-none relative block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-white dark:bg-gray-700 rounded-md focus:outline-none focus:z-10 sm:text-sm ${activeTheme.input}`}
                            placeholder="Registered Email Address"
                            value={recoveryInput}
                            onChange={(e) => setRecoveryInput(e.target.value)}
                        />
                        <div className="flex items-center justify-end space-x-4 mt-6">
                            <button onClick={handleCloseForgotPassword} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded-md text-gray-800 dark:text-gray-200 hover:bg-gray-400 dark:hover:bg-gray-500 btn-interactive">Cancel</button>
                            <button onClick={handleEmailCheckSubmit} className={`px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${activeTheme.button} btn-interactive`}>Send OTP</button>
                        </div>
                    </>
                )}
                
                {forgotPasswordStep === 'otp' && (
                     <>
                        <p className="text-gray-600 dark:text-gray-400 mb-4 text-center">
                           An OTP has been sent to <span className="font-semibold">{recoveryInput}</span>. Please enter the 6-digit code below.
                           <br/><small>(For demo, use any 6 digits)</small>
                        </p>
                        <input
                            type="text" required maxLength={6}
                            className={`appearance-none relative block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-white dark:bg-gray-700 rounded-md focus:outline-none focus:z-10 sm:text-sm text-center tracking-[.5em] ${activeTheme.input}`}
                            placeholder="_ _ _ _ _ _"
                            value={otpInput}
                            onChange={(e) => setOtpInput(e.target.value)}
                        />
                        <div className="flex items-center justify-end space-x-4 mt-6">
                            <button onClick={() => setForgotPasswordStep('input')} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded-md text-gray-800 dark:text-gray-200 btn-interactive">Back</button>
                            <button onClick={handleOtpVerification} className={`px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${activeTheme.button} btn-interactive`}>Verify OTP</button>
                        </div>
                    </>
                )}

                {forgotPasswordStep === 'reset' && (
                    <>
                         <p className="text-gray-600 dark:text-gray-400 mb-4 text-center">
                            Verification successful. Please enter your new password below.
                        </p>
                        <div className="space-y-4">
                            <input type="password" required className={`w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-md ${activeTheme.input}`} placeholder="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                            <input type="password" required className={`w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-md ${activeTheme.input}`} placeholder="Confirm New Password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} />
                        </div>
                        <div className="flex items-center justify-end space-x-4 mt-6">
                             <button onClick={() => setForgotPasswordStep('otp')} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded-md text-gray-800 dark:text-gray-200 btn-interactive">Back</button>
                            <button onClick={handleResetPasswordSubmit} className={`px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${activeTheme.button} btn-interactive`}>Reset Password</button>
                        </div>
                    </>
                )}

                {forgotPasswordStep === 'success' && (
                     <>
                        <p className="text-gray-600 dark:text-gray-400 text-center">
                            Your password has been successfully reset. You can now log in with your new password.
                        </p>
                        <div className="mt-6">
                            <button onClick={handleCloseForgotPassword} className={`w-full py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${activeTheme.button} btn-interactive`}>Back to Login</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
  );

  if (!selectedRole) {
    return (
       <>
       <div className="relative flex items-center justify-center min-h-screen login-background">
        <div onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} className="relative z-10 w-full max-w-md" style={{ perspective: '1000px' }}>
          <div ref={cardRef} style={{ ...cardStyle, transformStyle: 'preserve-3d' }} className="p-8 space-y-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg transition-transform duration-500">
            <div className="text-center">
                <div className="flex justify-center items-center mb-2">
                    <AnimatedNriitTitle colorClass={themes.ECE.logo} />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome to the Portal</h1>
                <p className="mt-1 text-gray-600 dark:text-gray-400">Please select your role to continue.</p>
            </div>
            <div className="space-y-4 pt-4">
              <button
                onClick={() => setSelectedRole(Role.STUDENT)}
                onMouseMove={handleButtonMouseMove}
                className={`group relative w-full flex items-center justify-center gap-3 py-4 px-4 border border-transparent text-lg font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${themes.ECE.button} lighting-button btn-interactive`}
              >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L9 9.48l8.705-4.247a1 1 0 00-.211-1.84l-7-3zM10 11.586l-7-3.419V14a1 1 0 001 1h12a1 1 0 001-1V8.167l-7 3.419z" /></svg>
                Student
              </button>
              <button
                onClick={() => setSelectedRole(Role.STAFF)}
                onMouseMove={handleButtonMouseMove}
                className={`group relative w-full flex items-center justify-center gap-3 py-4 px-4 border border-transparent text-lg font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${themes.EVT.button} lighting-button btn-interactive`}
              >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                Staff
              </button>
               <button
                onClick={() => setSelectedRole(Role.SUPER_ADMIN)}
                onMouseMove={handleButtonMouseMove}
                className={`group relative w-full flex items-center justify-center gap-3 py-4 px-4 border border-transparent text-lg font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${themes.SUPER_ADMIN.button} lighting-button btn-interactive`}
              >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" /></svg>
                Portal Management
              </button>
            </div>
            {isBiometricSupported && (
                 <div className="pt-2 border-t dark:border-gray-700">
                    <button
                        onClick={handleBiometricClick}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors btn-interactive"
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.2-2.858.5-4m1.5 8l.054-.09A13.916 13.916 0 008 11a4 4 0 00-.05-1.5m3.44-2.04L11.3 7.3" />
                         </svg>
                        Login with Fingerprint / Face ID
                    </button>
                 </div>
            )}
          </div>
        </div>
      </div>
      {renderForgotPasswordModal()}
      </>
    );
  }

  const currentLoginTheme = selectedRole === Role.SUPER_ADMIN ? adminTheme : activeTheme;
  const idPlaceholder = selectedRole === Role.STAFF ? "Staff ID" : selectedRole === Role.STUDENT ? "Roll Number" : "Username";

  return (
    <>
    <div className="relative flex items-center justify-center min-h-screen login-background">
      <div onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} className="relative z-10 w-full max-w-md" style={{ perspective: '1000px' }}>
        <div ref={cardRef} style={{ ...cardStyle, transformStyle: 'preserve-3d' }} className="p-8 space-y-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg transition-transform duration-500">
          <div className="text-center">
              <div className="flex justify-center items-center mb-2">
                <AnimatedNriitTitle colorClass={currentLoginTheme.logo} />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {selectedRole === Role.SUPER_ADMIN ? 'Portal Management' : `${selectedDepartment} ${selectedRole === Role.STUDENT ? 'Student' : 'Staff'} Portal`}
              </h1>
              <p className="mt-1 text-gray-600 dark:text-gray-400">Sign in to continue.</p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
             {selectedRole !== Role.SUPER_ADMIN && (
              <div>
                  <label htmlFor="department-select" className="sr-only">Select Department</label>
                  <select
                      id="department-select"
                      value={selectedDepartment}
                      onChange={(e) => setSelectedDepartment(e.target.value)}
                      className={`appearance-none relative block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-white dark:bg-gray-700 rounded-md focus:outline-none focus:z-10 sm:text-sm ${currentLoginTheme.input}`}
                  >
                      {departments.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                      ))}
                  </select>
              </div>
             )}
              <div>
                <label htmlFor="roll-number" className="sr-only">{idPlaceholder}</label>
                <input
                  id="roll-number"
                  name="roll-number"
                  type="text"
                  autoComplete="username"
                  required
                  className={`appearance-none relative block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-white dark:bg-gray-700 rounded-md focus:outline-none focus:z-10 sm:text-sm ${currentLoginTheme.input}`}
                  placeholder={idPlaceholder}
                  value={rollNumber}
                  onChange={(e) => setRollNumber(selectedRole === Role.SUPER_ADMIN ? e.target.value : e.target.value.toUpperCase())}
                />
              </div>
              <div className="relative">
                <label htmlFor="password" className="sr-only">Password</label>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className={`appearance-none relative block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-white dark:bg-gray-700 rounded-md focus:outline-none focus:z-10 sm:text-sm ${currentLoginTheme.input}`}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 z-20 flex items-center px-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074L3.707 2.293zM10 12a2 2 0 110-4 2 2 0 010 4z" clipRule="evenodd" />
                      <path d="M2 10s3.939 7 8 7a9.958 9.958 0 004.512-1.074l-1.473-1.473A8.003 8.003 0 0110 15c-3.517 0-6.442-2.316-7.581-5.438a1 1 0 01.042-.656A.996.996 0 012 10z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && <p className="text-sm text-red-500 text-center">{error}</p>}

            <div>
              <button
                type="submit"
                onMouseMove={handleButtonMouseMove}
                className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${currentLoginTheme.button} lighting-button btn-interactive`}
              >
                Sign in
              </button>
            </div>
          </form>
          
           {isBiometricSupported && (
            <div className="pt-2">
                 <button
                    type="button"
                    onClick={handleBiometricClick}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors btn-interactive"
                 >
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.2-2.858.5-4m1.5 8l.054-.09A13.916 13.916 0 008 11a4 4 0 00-.05-1.5m3.44-2.04L11.3 7.3" />
                     </svg>
                     Login with Biometrics
                 </button>
            </div>
           )}

          <div className="flex items-center justify-between mt-6 text-sm">
              {selectedRole === Role.STUDENT ? (
                  <button
                      type="button"
                      onClick={() => setShowForgotPasswordModal(true)}
                      className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 btn-interactive"
                  >
                      Forgot your password?
                  </button>
              ) : <div />}
              <button onClick={() => { setSelectedRole(null); setError(''); }} className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 btn-interactive">
                  Back to role selection
              </button>
          </div>
        </div>
      </div>
    </div>
    {renderForgotPasswordModal()}
    </>
  );
};

export default Login;
