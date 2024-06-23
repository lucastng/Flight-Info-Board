document.addEventListener("DOMContentLoaded", function () {
    let initialDistance = -1;
    let previousFlightStatus = null;
    let pageReloaded = false;
    let jetStreamInterval;

    function fetchInitialDistance() {
        fetch('/data/StartDistance.txt')
            .then(response => response.text())
            .then(initialData => {
                initialDistance = parseInt(initialData.trim());
                console.log('Initial Distance:', initialDistance);
                if (initialDistance === -1) {
                    console.log('Distance evaluation disabled.');
                } else if (isNaN(initialDistance) || initialDistance <= 0) {
                    console.error('Invalid initial distance value.');
                    initialDistance = -1; // Ensure we don't use invalid initial values
                } else {
                    fetchCurrentFlight().then(aircraftType => {
                        updateProgressBars(aircraftType);
                    });
                }
            })
            .catch(error => {
                console.error('Error fetching initial distance data:', error);
            });
    }

    function fetchCurrentFlight() {
        return fetch('/data/CurrentFlight.txt')
            .then(response => response.text())
            .then(data => {
                // Assuming the file contains the aircraft type and flight number separated by a space
                const [aircraftType, flightNumber] = data.trim().split(' ');
                return aircraftType;
            })
            .catch(error => {
                console.error('Error fetching current flight data:', error);
                return null;
            });
    }

    function fetchFlightStatus() {
        return fetch('/data/FlightStatus.txt')
            .then(response => response.text())
            .then(data => {
                // Assuming the file contains a single word representing the flight status
                const flightStatus = data.trim();
                return flightStatus;
            })
            .catch(error => {
                console.error('Error fetching Flight Status data:', error);
                return null;
            });
    }

    function checkFlightStatus() {
        fetchFlightStatus().then(currentFlightStatus => {
            if (currentFlightStatus !== null && currentFlightStatus !== previousFlightStatus && !pageReloaded) {
                pageReloaded = true; // Set the flag to true to prevent further reloads
                location.reload();   // Reload the page
            } else {
                previousFlightStatus = currentFlightStatus; // Update the previous flight status
            }
        });
    }

    setInterval(checkFlightStatus, 20000); // This sets the interval to check the flight status every 20 seconds

    function startJetStreamCycling() {
        let imageIndex = 1;
        jetStreamInterval = setInterval(() => {
            const jetStreamImage = document.getElementById('jetstream-image');
            if (jetStreamImage) {
                jetStreamImage.src = `/Image/JetStream/JetStream${imageIndex}.png`;
                imageIndex = (imageIndex % 5) + 1; // Cycle through 1 to 5
            }
        }, 20); // Change image every 20ms
    }

    function stopJetStreamCycling() {
        clearInterval(jetStreamInterval);
        const jetStreamImage = document.getElementById('jetstream-image');
        if (jetStreamImage) {
            jetStreamImage.style.opacity = 0; // Hide jetstream image
        }
    }

    function updateProgressBars(aircraftType) {
        if (initialDistance === -1) {
            return;
        }
        fetch('/data/DistToDestination.txt')
            .then(response => response.text())
            .then(currentData => {
                const currentDistance = parseInt(currentData.trim());
                const progressBar = document.getElementById('ete-bar');
                const aircraftImage = document.getElementById('aircraft-image');
                const eteText = document.getElementById('ete-bar-text'); // ETE text element
                const jetStreamImage = document.getElementById('jetstream-image');

                if (progressBar && !isNaN(currentDistance)) {
                    const progressPercentage = Math.min((currentDistance / initialDistance) * 100, 100);
                    updateProgressBarWidth(progressBar, progressPercentage);
                    animateAircraftImage(aircraftImage, progressPercentage);
                    updateETEText(eteText, aircraftType, progressPercentage);
                    handleOpacity(progressBar, jetStreamImage, aircraftImage, eteText, progressPercentage);
                    saveProgressState(currentDistance, progressPercentage);
                }
            })
            .catch(error => {
                console.error('Error fetching distance to destination data:', error);
                const progressBar = document.getElementById('ete-bar');
                const aircraftImage = document.getElementById('aircraft-image');
                const eteText = document.getElementById('ete-bar-text'); // ETE text element
                progressBar.style.width = '0%';
                progressBar.style.opacity = 0;
                aircraftImage.style.opacity = 0;
                eteText.style.opacity = 0;
            });
    }

    function updateProgressBarWidth(progressBar, percentage) {
        progressBar.style.width = percentage + '%';
        progressBar.style.opacity = 1; // Ensure the green bar is always visible
    }

    function animateAircraftImage(aircraftImage, percentage) {
        const containerWidth = document.querySelector('.ete-bar-container').offsetWidth;
        const imagePosition = (containerWidth * percentage / 100) - (aircraftImage.offsetWidth / 2);
        aircraftImage.style.left = imagePosition + 'px';
    }

    function updateETEText(eteText, aircraftType, percentage) {
        // Fetch ETE_SRGS.txt for the text to display on the bar
        Promise.all([
            fetch('/data/DistToDestination.txt').then(response => response.text()),
            fetch('/data/ETE_SRGS.txt').then(response => response.text())
        ])
            .then(([distText, eteTextA]) => {
                const distanceText = distText.trim() + " KM";
                const combinedText = `${eteTextA.trim()} | ${distanceText}`;
                eteText.textContent = combinedText; // Update text content with combined ETE and Distance
            })
            .catch(error => console.error('Error fetching ETE data:', error));
    }

    function handleOpacity(progressBar, jetStreamImage, aircraftImage, eteText, percentage) {
        if (percentage === 100) {
            progressBar.style.opacity = 1;
            jetStreamImage.style.opacity = 0;
            aircraftImage.style.opacity = 1;
            eteText.style.opacity = 1;
            stopJetStreamCycling();
        } else if (percentage < 100 && percentage > 0) {
            progressBar.style.opacity = 1;
            jetStreamImage.style.opacity = 1;
            aircraftImage.style.opacity = 1;
            eteText.style.opacity = 1;
            startJetStreamCycling();
        } else if (percentage === 0) {
            progressBar.style.opacity = 0;
            jetStreamImage.style.opacity = 0;
            aircraftImage.style.opacity = 1;
            eteText.style.opacity = 1;
            stopJetStreamCycling();
        } else if (percentage <= 16) {
            progressBar.style.opacity = 1;
            jetStreamImage.style.opacity = 1;
            aircraftImage.style.opacity = 1;
            eteText.style.opacity = 1;
            stopJetStreamCycling();
            const containerWidth = document.querySelector('.ete-bar-container').offsetWidth;
            const imagePosition = (containerWidth * 16 / 100) - (aircraftImage.offsetWidth / 2);
            aircraftImage.style.left = `${imagePosition}px`;
            eteText.style.left = `${imagePosition}px`;
        }
    }

    function saveProgressState(currentDistance, progressPercentage) {
        localStorage.setItem('currentDistance', currentDistance);
        localStorage.setItem('progressPercentage', progressPercentage);
    }

    function loadProgressState() {
        const currentDistance = localStorage.getItem('currentDistance');
        const progressPercentage = localStorage.getItem('progressPercentage');
        return {
            currentDistance: currentDistance ? parseInt(currentDistance) : null,
            progressPercentage: progressPercentage ? parseFloat(progressPercentage) : null
        };
    }

    function initializeProgress() {
        const { currentDistance, progressPercentage } = loadProgressState();
        if (currentDistance !== null && progressPercentage !== null) {
            const progressBar = document.getElementById('ete-bar');
            const aircraftImage = document.getElementById('aircraft-image');
            const eteText = document.getElementById('ete-bar-text');
            updateProgressBarWidth(progressBar, progressPercentage);
            animateAircraftImage(aircraftImage, progressPercentage);
            updateETEText(eteText, progressPercentage);
        }
    }

    function sortTable(columnIndex, dir = 'asc') {
        var table = document.getElementById("flightTable");
        var rows = table.rows;
        var switching = true;
        var shouldSwitch, i;
        var switchcount = 0;

        // Clear existing sort indicators
        var headers = table.getElementsByTagName("th");
        for (i = 0; i < headers.length; i++) {
            headers[i].classList.remove("sort-asc", "sort-desc");
        }

        while (switching) {
            switching = false;
            var rowsArray = Array.prototype.slice.call(rows, 2); // Skip the header row and the green bar row

            for (i = 0; i < rowsArray.length - 1; i++) {
                shouldSwitch = false;
                var x = rowsArray[i].getElementsByTagName("TD")[columnIndex];
                var y = rowsArray[i + 1].getElementsByTagName("TD")[columnIndex];

                if (dir == "asc") {
                    if (x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase()) {
                        shouldSwitch = true;
                        break;
                    }
                } else if (dir == "desc") {
                    if (x.innerHTML.toLowerCase() < y.innerHTML.toLowerCase()) {
                        shouldSwitch = true;
                        break;
                    }
                }
            }

            if (shouldSwitch) {
                rowsArray[i].parentNode.insertBefore(rowsArray[i + 1], rowsArray[i]);
                switching = true;
                switchcount++;
            } else {
                if (switchcount == 0 && dir == "asc") {
                    dir = "desc";
                    switching = true;
                }
            }
        }

        // Add sort indicator to the sorted column header
        if (dir == "asc") {
            headers[columnIndex].classList.add("sort-asc");
        } else {
            headers[columnIndex].classList.add("sort-desc");
        }

        // Save sort state
        localStorage.setItem('sortColumnIndex', columnIndex);
        localStorage.setItem('sortDirection', dir);
    }

    function initialize() {
        // Set image paths
        const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:8080' : 'https://flight-info-board.vercel.app';
        document.querySelectorAll('img[data-src]').forEach(img => {
            img.src = baseUrl + img.getAttribute('data-src');
            console.log('Setting image src:', img.src); // Debugging line
        });

        // Restore sort state
        var sortColumnIndex = localStorage.getItem('sortColumnIndex');
        var sortDirection = localStorage.getItem('sortDirection');
        if (sortColumnIndex !== null && sortDirection !== null) {
            sortTable(parseInt(sortColumnIndex), sortDirection);
        } else {
            // Default sort by Flight Status on first load
            sortTable(3, 'asc');
        }

        // Fetch initial distance value
        fetchInitialDistance();

        // Automatically sort by Flight Status every 20000 milliseconds
        setInterval(function () {
            sortTable(3, localStorage.getItem('sortDirection') || 'asc'); // Sort by Flight Status (column index 3)
        }, 20000);

        // Refresh the Greenbar function every 2000 milliseconds
        setInterval(function () {
            fetchCurrentFlight().then(aircraftType => {
                updateProgressBars(aircraftType);
            });
        }, 2000);

        // Initialize progress from stored state
        initializeProgress();
    }

    initialize();
});
