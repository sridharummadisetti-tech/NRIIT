

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { User, Role, StudentData, ParsedAttendanceRecord, AttendanceRecord, SectionTimeTable, Notice } from './types';
import { USERS, STUDENT_DATA, TIMETABLES, NOTICES, DEFAULT_PERIOD_TIMES, DEPARTMENTS } from './constants';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

const AnimatedNriitTitle: React.FC<{ colorClass: string }> = ({ colorClass }) => (
    <div className={`nriit-3d-text ${colorClass}`}>
      <span>N</span>
      <span>R</span>
      <span>I</span>
      <span>I</span>
      <span>T</span>
    </div>
);

const SplashScreen: React.FC = () => {
    return (
        <div className="fixed inset-0 flex justify-center items-center z-50 login-background anim-splash-screen">
            <div className="anim-splash-logo">
                <AnimatedNriitTitle colorClass="text-white" />
            </div>
        </div>
    );
};

// --- Biometric Helpers ---
const bufferToBase64URLString = (buffer: ArrayBuffer) => {
    const bytes = new Uint8Array(buffer);
    let str = '';
    for (const charCode of bytes) {
        str += String.fromCharCode(charCode);
    }
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

const base64URLStringToBuffer = (base64URLString: string) => {
    const base64 = base64URLString.replace(/-/g, '+').replace(/_/g, '/');
    const padLen = (4 - (base64.length % 4)) % 4;
    const padded = base64.padEnd(base64.length + padLen, '=');
    const binaryString = atob(padded);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
};

const App: React.FC = () => {
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(USERS);
  const [studentData, setStudentData] = useState<StudentData[]>(STUDENT_DATA);
  const [timetables, setTimetables] = useState<SectionTimeTable[]>(TIMETABLES);
  const [notices, setNotices] = useState<Notice[]>(NOTICES);
  const [periodTimes, setPeriodTimes] = useState<string[]>(DEFAULT_PERIOD_TIMES);
  const [departments, setDepartments] = useState<string[]>(DEPARTMENTS);
  
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    const savedTheme = localStorage.getItem('theme');
    return (savedTheme === 'light' || savedTheme === 'dark') ? savedTheme : 'system';
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAppLoading(false);
    }, 3000); 
    return () => clearTimeout(timer);
  }, []);
  
  useEffect(() => {
    const root = window.document.documentElement;
    const isDark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    root.classList.toggle('dark', isDark);
    
    if (theme === 'light' || theme === 'dark') {
      localStorage.setItem('theme', theme);
    } else {
      localStorage.removeItem('theme');
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        root.classList.toggle('dark', mediaQuery.matches);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);


  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!currentUser) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        return;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;
    const handleResize = () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    
    const isEffectiveDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    const particles: any[] = [];
    const properties = {
        particleColor: isEffectiveDark ? 'rgba(129, 140, 248, 0.4)' : 'rgba(99, 102, 241, 0.5)',
        particleRadius: 3,
        particleCount: Math.min(60, Math.floor(width / 30)),
        particleMaxVelocity: 0.5,
        lineLength: 150,
        lineColor: isEffectiveDark ? 'rgba(79, 70, 229, 0.4)' : 'rgba(165, 180, 252, 0.5)',
    };

    class Particle {
        x: number;
        y: number;
        velocityX: number;
        velocityY: number;

        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.velocityX = Math.random() * (properties.particleMaxVelocity * 2) - properties.particleMaxVelocity;
            this.velocityY = Math.random() * (properties.particleMaxVelocity * 2) - properties.particleMaxVelocity;
        }

        position() {
            if ((this.x + this.velocityX > width && this.velocityX > 0) || (this.x + this.velocityX < 0 && this.velocityX < 0)) {
                this.velocityX *= -1;
            }
            if ((this.y + this.velocityY > height && this.velocityY > 0) || (this.y + this.velocityY < 0 && this.velocityY < 0)) {
                this.velocityY *= -1;
            }
            this.x += this.velocityX;
            this.y += this.velocityY;
        }

        reDraw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, properties.particleRadius, 0, Math.PI * 2);
            ctx.closePath();
            ctx.fillStyle = properties.particleColor;
            ctx.fill();
        }
    }

    const reDrawParticles = () => {
        for (const i in particles) {
            particles[i].reDraw();
        }
    };

    const drawLines = () => {
        for (const i in particles) {
            for (const j in particles) {
                const x1 = particles[i].x;
                const y1 = particles[i].y;
                const x2 = particles[j].x;
                const y2 = particles[j].y;
                const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
                if (length < properties.lineLength) {
                    const opacity = 1 - length / properties.lineLength;
                    ctx.lineWidth = 0.5;
                    ctx.strokeStyle = properties.lineColor.replace(/,\s*\d?\.?\d*\)$/, `, ${opacity})`);
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.closePath();
                    ctx.stroke();
                }
            }
        }
    };
    
    let animationFrameId: number;
    const loop = () => {
        ctx.clearRect(0, 0, width, height);
        reDrawParticles();
        drawLines();
        for(const i in particles) {
            particles[i].position();
        }
        animationFrameId = requestAnimationFrame(loop);
    };
    
    for (let i = 0; i < properties.particleCount; i++) {
        particles.push(new Particle());
    }

    loop();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };

  }, [currentUser, theme]);

  const handleLogin = useCallback((rollNumber: string, password: string, department: string, role: Role): 'SUCCESS' | 'WRONG_DEPARTMENT' | 'INVALID_CREDENTIALS' => {
    if (role === Role.SUPER_ADMIN) {
        const user = users.find(u => u.role === Role.SUPER_ADMIN && u.rollNumber === rollNumber && u.password === password);
        if (user) {
            setCurrentUser(user);
            return 'SUCCESS';
        }
        return 'INVALID_CREDENTIALS';
    }
    
    const user = users.find(u => u.rollNumber === rollNumber && u.password === password);
    
    if (!user) {
      return 'INVALID_CREDENTIALS';
    }

    if (user.role !== role) {
        return 'INVALID_CREDENTIALS';
    }
    
    if (user.department !== department) {
      return 'WRONG_DEPARTMENT';
    }

    setCurrentUser(user);
    return 'SUCCESS';
  }, [users]);

  // --- Biometric Handlers ---

  const handleBiometricSetup = async (user: User): Promise<boolean> => {
      if (!window.PublicKeyCredential) {
          alert("Your device does not support biometric authentication.");
          return false;
      }

      try {
          // Generate a random challenge
          const challenge = new Uint8Array(32);
          window.crypto.getRandomValues(challenge);

          const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
              challenge,
              rp: {
                  name: "NRIIT Student Portal",
                  id: window.location.hostname,
              },
              user: {
                  id: Uint8Array.from(String(user.id), c => c.charCodeAt(0)),
                  name: user.rollNumber,
                  displayName: user.name,
              },
              pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
              authenticatorSelection: {
                  authenticatorAttachment: "platform",
                  userVerification: "required",
                  residentKey: "required",
                  requireResidentKey: true,
              },
              timeout: 60000,
              attestation: "none"
          };

          const credential = await navigator.credentials.create({
              publicKey: publicKeyCredentialCreationOptions
          }) as PublicKeyCredential;

          if (credential) {
              const credentialId = bufferToBase64URLString(credential.rawId);
              
              // Store credential ID mapped to user ID in localStorage (Simulating DB)
              const existingCredsString = localStorage.getItem('biometric_credentials');
              let existingCreds: { credentialId: string; userId: number }[] = [];
              if (existingCredsString) {
                  existingCreds = JSON.parse(existingCredsString);
              }

              // Remove old creds for this user to keep it simple (1 device per user in this demo)
              const filteredCreds = existingCreds.filter(c => c.userId !== user.id);
              filteredCreds.push({ credentialId, userId: user.id });
              
              localStorage.setItem('biometric_credentials', JSON.stringify(filteredCreds));
              return true;
          }
      } catch (err) {
          console.error("Biometric setup failed", err);
      }
      return false;
  };

  const handleBiometricLogin = async (): Promise<'SUCCESS' | 'NOT_FOUND' | 'ERROR'> => {
      if (!window.PublicKeyCredential) return 'ERROR';

      try {
           const challenge = new Uint8Array(32);
           window.crypto.getRandomValues(challenge);

           const credential = await navigator.credentials.get({
               publicKey: {
                   challenge,
                   rpId: window.location.hostname,
                   userVerification: "required",
               }
           }) as PublicKeyCredential;

           if (credential) {
                const credentialId = bufferToBase64URLString(credential.rawId);
                const storedCredsString = localStorage.getItem('biometric_credentials');
                
                if (storedCredsString) {
                    const storedCreds: { credentialId: string; userId: number }[] = JSON.parse(storedCredsString);
                    const match = storedCreds.find(c => c.credentialId === credentialId);
                    
                    if (match) {
                        const user = users.find(u => u.id === match.userId);
                        if (user) {
                            setCurrentUser(user);
                            return 'SUCCESS';
                        }
                    }
                }
                return 'NOT_FOUND';
           }
      } catch (err) {
          console.error("Biometric login failed", err);
          return 'ERROR';
      }
      return 'ERROR';
  };


  const handleLogout = useCallback(() => {
    setCurrentUser(null);
  }, []);

  const handleUpdateUser = (updatedUser: User) => {
    setUsers(prevUsers => prevUsers.map(user => user.id === updatedUser.id ? updatedUser : user));
    if (currentUser?.id === updatedUser.id) {
        setCurrentUser(updatedUser);
    }
  };
  
  const handleDeleteUser = (userId: number) => {
    setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
    setStudentData(prevData => prevData.filter(sd => sd.userId !== userId));
  };

  const handleUpdateStudentData = (updatedStudentData: StudentData) => {
    setStudentData(prevData => prevData.map(sd => sd.userId === updatedStudentData.userId ? updatedStudentData : sd));
  };
  
  const handleUpdateMultipleStudentData = useCallback((updatedStudents: StudentData[]) => {
    setStudentData(prevData => {
        const dataMap = new Map(updatedStudents.map(s => [s.userId, s]));
        return prevData.map(sd => dataMap.get(sd.userId) || sd);
    });
  }, []);

  const handleUpdateTimetable = (updatedTimetable: SectionTimeTable) => {
    setTimetables(prev => {
        const existingIndex = prev.findIndex(
            t => t.department === updatedTimetable.department && 
                 t.year === updatedTimetable.year && 
                 t.section === updatedTimetable.section
        );
        if (existingIndex !== -1) {
            const newTimetables = [...prev];
            newTimetables[existingIndex] = updatedTimetable;
            return newTimetables;
        } else {
            return [...prev, updatedTimetable];
        }
    });
  };

  const handleUpdatePeriodTimes = (newTimes: string[]) => {
    setPeriodTimes(newTimes);
  };

  const handleAddNotice = (newNotice: Omit<Notice, 'id'>) => {
    setNotices(prev => [...prev, { ...newNotice, id: Date.now() }].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };

  const handleDeleteNotice = (noticeId: number) => {
    setNotices(prev => prev.filter(n => n.id !== noticeId));
  };

  const handleAddStudent = (newUser: User, newStudentData: StudentData) => {
    setUsers(prevUsers => [...prevUsers, newUser]);
    setStudentData(prevData => [...prevData, newStudentData]);
  };

  const handleAddStaff = (newUser: User) => {
    setUsers(prevUsers => [...prevUsers, newUser]);
  };

  const handleAddMultipleStudents = (newUsers: User[], newStudentDataItems: StudentData[]) => {
    setUsers(prevUsers => [...prevUsers, ...newUsers]);
    setStudentData(prevData => [...prevData, ...newStudentDataItems]);
  };

  const handleUpdateMultipleAttendance = useCallback((attendanceUpdates: ParsedAttendanceRecord[]) => {
    const userMap = new Map(users.map(u => [u.rollNumber, u.id]));

    setStudentData(prevData => {
      const newData = JSON.parse(JSON.stringify(prevData));
      
      attendanceUpdates.forEach(update => {
        const userId = userMap.get(update.rollNumber);
        if (userId) {
          const studentDataIndex = newData.findIndex((sd: StudentData) => sd.userId === userId);
          if (studentDataIndex !== -1) {
            const student = newData[studentDataIndex];
            const existingRecordIndex = student.monthlyAttendance.findIndex(
              (r: AttendanceRecord) => r.month.toLowerCase() === update.month.toLowerCase() && r.year === update.year
            );
            
            const newRecord = {
                month: update.month,
                year: update.year,
                present: update.present,
                total: update.total,
            };

            if (existingRecordIndex !== -1) {
              student.monthlyAttendance[existingRecordIndex] = newRecord;
            } else {
              student.monthlyAttendance.push(newRecord);
            }
          }
        }
      });
      return newData;
    });
  }, [users]);
  
  const handleCheckEmailExists = useCallback((email: string): boolean => {
    return users.some(u => u.role === Role.STUDENT && u.email && u.email.toLowerCase() === email.toLowerCase());
  }, [users]);

  const handleResetPassword = useCallback((email: string, newPass: string): boolean => {
      const userIndex = users.findIndex(u => u.role === Role.STUDENT && u.email && u.email.toLowerCase() === email.toLowerCase());
      
      if (userIndex === -1) {
          return false;
      }
      
      const updatedUsers = [...users];
      updatedUsers[userIndex] = { ...updatedUsers[userIndex], password: newPass };
      setUsers(updatedUsers);
      return true;
  }, [users]);

  const handleUpdatePassword = useCallback((userId: number, currentPass: string, newPass: string): 'SUCCESS' | 'INCORRECT_PASSWORD' => {
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) return 'INCORRECT_PASSWORD';

    const user = users[userIndex];
    if (user.password !== currentPass) {
        return 'INCORRECT_PASSWORD';
    }
    
    const updatedUsers = [...users];
    updatedUsers[userIndex] = { ...updatedUsers[userIndex], password: newPass };
    setUsers(updatedUsers);
    
    if (currentUser?.id === userId) {
        setCurrentUser(prev => prev ? { ...prev, password: newPass } : null);
    }
    
    return 'SUCCESS';
  }, [users, currentUser]);

  const handleAddDepartment = (newDepartment: string) => {
    setDepartments(prev => [...prev, newDepartment].sort());
  };

  const handleUpdateDepartment = (oldName: string, newName: string) => {
    setDepartments(prev => prev.map(d => (d === oldName ? newName : d)).sort());
    setUsers(prevUsers =>
      prevUsers.map(u => (u.department === oldName ? { ...u, department: newName } : u))
    );
  };

  const handleDeleteDepartment = (departmentName: string) => {
    if (users.some(u => u.department === departmentName)) {
        alert(`Cannot delete department "${departmentName}" as it still has users assigned to it.`);
        return;
    }
    setDepartments(prev => prev.filter(d => d !== departmentName));
  };


  if (isAppLoading) {
    return <SplashScreen />;
  }

  return (
    <div className="relative min-h-screen bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-gray-100 font-sans overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-0 pointer-events-none"></canvas>
      <div className="relative z-10">
        {currentUser ? (
          <Dashboard 
            user={currentUser} 
            onLogout={handleLogout}
            users={users}
            studentData={studentData}
            timetables={timetables}
            notices={notices}
            periodTimes={periodTimes}
            departments={departments}
            theme={theme}
            setTheme={setTheme}
            onUpdateUser={handleUpdateUser}
            onDeleteUser={handleDeleteUser}
            onUpdateStudentData={handleUpdateStudentData}
            onUpdateMultipleStudentData={handleUpdateMultipleStudentData}
            onAddStudent={handleAddStudent}
            onAddStaff={handleAddStaff}
            onAddMultipleStudents={handleAddMultipleStudents}
            onUpdateMultipleAttendance={handleUpdateMultipleAttendance}
            onUpdatePassword={handleUpdatePassword}
            onUpdateTimetable={handleUpdateTimetable}
            onUpdatePeriodTimes={handleUpdatePeriodTimes}
            onAddNotice={handleAddNotice}
            onDeleteNotice={handleDeleteNotice}
            onAddDepartment={handleAddDepartment}
            onUpdateDepartment={handleUpdateDepartment}
            onDeleteDepartment={handleDeleteDepartment}
            onBiometricSetup={handleBiometricSetup}
          />
        ) : (
          <Login 
            onLogin={handleLogin} 
            onCheckEmailExists={handleCheckEmailExists} 
            onResetPassword={handleResetPassword} 
            departments={departments}
            onBiometricLogin={handleBiometricLogin}
          />
        )}
      </div>
    </div>
  );
};

export default App;