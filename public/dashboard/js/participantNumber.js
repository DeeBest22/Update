 let presentStats = null;
        let presentUser = null;

        // Load statistics on page load
        document.addEventListener('DOMContentLoaded', function() {
            loadUserInfo();
            loadStats();
        });

        async function loadUserInfo() {
            try {
                const response = await fetch('/api/user');
                if (response.ok) {
                    const data = await response.json();
                    presentUser = data.user;
                    displayUserInfo(presentUser);
                }
            } catch (error) {
                console.error('Error loading user info:', error);
            }
        }

        function displayUserInfo(user) {
            const userInfo = document.getElementById('user-info');
            const userAvatar = document.getElementById('user-avatar');
            const userName = document.getElementById('user-name');

            if (user.profilePicture) {
                userAvatar.innerHTML = `<img src="${user.profilePicture}" alt="Profile" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
            } else {
                userAvatar.textContent = user.name.charAt(0).toUpperCase();
            }

            userName.textContent = user.name;
       
        }
        async function loadStats() {
    
            const error = document.getElementById('error');
   

     
            error.style.display = 'none';
       

            try {
                const response = await fetch('/api/meeting-participant-stats');
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                presentStats = data;
                displayStats(data);


            } catch (err) {
                console.error('Error loading stats:', err);
          
                error.style.display = 'block';
                
                // Show more detailed error information
                const errorElement = document.getElementById('error');
                errorElement.innerHTML = `
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Failed to load statistics: ${err.message}</p>
                    <p style="font-size: 0.9rem; margin-top: 10px;">Make sure you've hosted at least one meeting to see statistics.</p>
                `;
            }
        }

        function displayStats(data) {
            // Update participants count
            document.getElementById('present-participants').textContent = data.present.participants;
            updateChangeIndicator('participants-change', data.present.participants, data.previous.participants);
        }

        function updateChangeIndicator(elementId, present, previous) {
            const element = document.getElementById(elementId);
            
            if (previous === 0 && present === 0) {
                element.className = 'stat-change neutral';
                element.innerHTML = '<span>No data available</span>';
                return;
            }

            if (previous === 0 && present > 0) {
                element.className = 'stat-change positive';
                element.innerHTML = `+100% from last month<i class="fas fa-arrow-up"></i>`;
                return;
            }

            if (previous === 0) {
                element.className = 'stat-change neutral';
                element.innerHTML = '<span>No data from last month</span>';
                return;
            }

            const percentageChange = Math.round(((present - previous) / previous) * 100);
            const absChange = Math.abs(percentageChange);
            
            if (percentageChange > 0) {
                element.className = 'stat-change positive';
                element.innerHTML = `+${absChange}% from last month<i class="fas fa-arrow-up"></i>`;
            } else if (percentageChange < 0) {
                element.className = 'stat-change negative';
                element.innerHTML = `-${absChange}% from last month<i class="fas fa-arrow-down"></i>`;
            } else {
                element.className = 'stat-change neutral';
                element.innerHTML = 'No change from last month<i class="fas fa-minus"></i>';
            }
        }

        // Add some animation effects
        function animateNumbers() {
            const numbers = document.querySelectorAll('.stat-number');
            numbers.forEach(number => {
                const finalValue = parseInt(number.textContent);
                let presentValue = 0;
                const increment = finalValue / 30;
                
                const timer = setInterval(() => {
                    presentValue += increment;
                    if (presentValue >= finalValue) {
                        number.textContent = finalValue;
                        clearInterval(timer);
                    } else {
                        number.textContent = Math.floor(presentValue);
                    }
                }, 50);
            });
        }
