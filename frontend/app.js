/**
 * StoryCut V2 Frontend Logic
 * Implements the State Machine and UI Rendering.
 */

const CONFIG = {
    // PASTE YOUR GOOGLE APPS SCRIPT WEB APP URL HERE
    API_URL: "REPLACE_WITH_YOUR_WEB_APP_URL",
};

const State = {
    step: 0,
    data: {
        services: [],
        barbers: [],
    },
    selection: {
        service: null,
        barber: null,
        date: null,
        time: null,
        customer: { name: '', phone: '' },
        slipFile: null
    }
};

const Steps = [
    { id: 'service', title: 'Select Service' },
    { id: 'barber', title: 'Select Barber' },
    { id: 'datetime', title: 'Date & Time' },
    { id: 'info', title: 'Your Details' },
    { id: 'review', title: 'Review & Pay' }
];

const App = {
    init: async () => {
        App.renderLoading();
        // Simulate fetching initial data (Replace with API call later)
        // const response = await fetch(CONFIG.API_URL, { method: 'POST', body: JSON.stringify({ action: 'getInitialData' }) });
        // const result = await response.json();

        // Mock Data for Demo
        State.data.services = [
            { id: 's1', name: 'Hair Cut', price: 400, duration: 60 },
            { id: 's2', name: 'Cut + Color', price: 1200, duration: 120 },
            { id: 's3', name: 'Shave', price: 300, duration: 30 },
        ];
        State.data.barbers = [
            { id: 'b1', name: 'Master Tee', imageUrl: 'https://ui-avatars.com/api/?name=Tee&background=0D8ABC&color=fff' },
            { id: 'b2', name: 'Barber John', imageUrl: 'https://ui-avatars.com/api/?name=John&background=random' },
        ];

        App.renderStep();
    },

    renderStep: () => {
        const step = Steps[State.step];
        document.getElementById('step-title').innerText = step.title;
        document.getElementById('progress-bar').style.width = `${((State.step + 1) / Steps.length) * 100}%`;

        // Navigation Buttons
        const btnBack = document.getElementById('btn-back');
        const btnNext = document.getElementById('btn-next');

        if (State.step === 0) btnBack.classList.add('hidden');
        else btnBack.classList.remove('hidden');

        if (State.step === Steps.length - 1) btnNext.innerText = 'Confirm Booking';
        else btnNext.innerText = 'Continue';

        // Render Content
        const content = document.getElementById('content');
        content.innerHTML = ''; // Clear previous

        switch (State.step) {
            case 0: App.renderServices(content); break;
            case 1: App.renderBarbers(content); break;
            case 2: App.renderDateTime(content); break;
            case 3: App.renderInfo(content); break;
            case 4: App.renderReview(content); break;
        }

        App.validateStep();
    },

    renderServices: (container) => {
        const grid = document.createElement('div');
        grid.className = 'space-y-3 slide-enter';
        State.data.services.forEach(s => {
            const el = document.createElement('div');
            const isSelected = State.selection.service?.id === s.id;
            el.className = `p-4 rounded-xl border-2 cursor-pointer transition-all flex justify-between items-center ${isSelected ? 'border-black bg-gray-50' : 'border-gray-100 hover:border-gray-300'}`;
            el.onclick = () => { State.selection.service = s; App.renderStep(); };
            el.innerHTML = `
                <div>
                    <h3 class="font-bold text-lg">${s.name}</h3>
                    <p class="text-sm text-gray-500">${s.duration} mins</p>
                </div>
                <span class="font-semibold">฿${s.price}</span>
            `;
            grid.appendChild(el);
        });
        container.appendChild(grid);
    },

    renderBarbers: (container) => {
        const grid = document.createElement('div');
        grid.className = 'grid grid-cols-2 gap-4 slide-enter';
        State.data.barbers.forEach(b => {
            const el = document.createElement('div');
            const isSelected = State.selection.barber?.id === b.id;
            el.className = `p-4 rounded-xl border-2 cursor-pointer transition-all text-center ${isSelected ? 'border-black bg-gray-50' : 'border-gray-100 hover:border-gray-300'}`;
            el.onclick = () => { State.selection.barber = b; App.renderStep(); };
            el.innerHTML = `
                <img src="${b.imageUrl}" class="w-16 h-16 rounded-full mx-auto mb-3 object-cover bg-gray-200">
                <h3 class="font-bold">${b.name}</h3>
            `;
            grid.appendChild(el);
        });
        container.appendChild(grid);
    },

    renderDateTime: (container) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'space-y-6 slide-enter';

        // Date Input (Native for simplicity)
        const dateGroup = document.createElement('div');
        dateGroup.innerHTML = `
            <label class="block text-sm font-bold mb-2">Select Date</label>
            <input type="date" id="date-input" class="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-black" 
                   value="${State.selection.date || ''}" onchange="App.handleDateChange(this.value)">
        `;
        wrapper.appendChild(dateGroup);

        // Slots
        if (State.selection.date) {
            const slotGroup = document.createElement('div');
            slotGroup.innerHTML = `<label class="block text-sm font-bold mb-2">Available Time</label>`;
            const slots = document.createElement('div');
            slots.className = 'grid grid-cols-3 gap-2';

            // Mock slots
            const mockSlots = ['10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

            mockSlots.forEach(time => {
                const btn = document.createElement('button');
                const isSelected = State.selection.time === time;
                btn.className = `py-2 rounded-lg text-sm font-medium transition-colors ${isSelected ? 'bg-black text-white' : 'bg-gray-100 hover:bg-gray-200'}`;
                btn.innerText = time;
                btn.onclick = () => { State.selection.time = time; App.renderStep(); };
                slots.appendChild(btn);
            });
            slotGroup.appendChild(slots);
            wrapper.appendChild(slotGroup);
        }

        container.appendChild(wrapper);
    },

    handleDateChange: (date) => {
        State.selection.date = date;
        State.selection.time = null; // Reset time on date change
        App.renderStep();
    },

    renderInfo: (container) => {
        const form = document.createElement('div');
        form.className = 'space-y-4 slide-enter';
        form.innerHTML = `
            <div>
                <label class="block text-sm font-bold mb-2">Full Name</label>
                <input type="text" class="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-black"
                       value="${State.selection.customer.name}" oninput="App.updateInfo('name', this.value)">
            </div>
            <div>
                <label class="block text-sm font-bold mb-2">Phone Number</label>
                <input type="tel" class="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-black"
                       value="${State.selection.customer.phone}" oninput="App.updateInfo('phone', this.value)">
            </div>
            <div>
                 <label class="block text-sm font-bold mb-2">Payment Slip</label>
                 <div class="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 cursor-pointer relative">
                    <input type="file" accept="image/*" class="absolute inset-0 opacity-0 cursor-pointer" onchange="App.handleFile(this)">
                    <div id="file-preview" class="space-y-2">
                        <span class="text-gray-400">Tap to upload slip</span>
                    </div>
                 </div>
            </div>
        `;
        container.appendChild(form);

        // Restore file preview if exists
        if (State.selection.slipFile) {
            const preview = document.getElementById('file-preview');
            preview.innerHTML = `<span class="text-green-600 font-medium">${State.selection.slipFile.name} (Ready)</span>`;
        }
    },

    updateInfo: (field, value) => {
        State.selection.customer[field] = value;
        App.validateStep();
    },

    handleFile: (input) => {
        if (input.files && input.files[0]) {
            State.selection.slipFile = input.files[0];
            const preview = document.getElementById('file-preview');
            preview.innerHTML = `<span class="text-green-600 font-medium">${input.files[0].name} (Ready)</span>`;
            App.validateStep();
        }
    },

    renderReview: (container) => {
        const s = State.selection;
        const div = document.createElement('div');
        div.className = 'space-y-6 slide-enter';
        div.innerHTML = `
            <div class="bg-gray-50 p-6 rounded-2xl space-y-4">
                <div class="flex justify-between">
                    <span class="text-gray-500">Service</span>
                    <span class="font-bold">${s.service.name}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-500">Barber</span>
                    <span class="font-bold">${s.barber.name}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-500">Date & Time</span>
                    <span class="font-bold">${s.date} @ ${s.time}</span>
                </div>
                <div class="h-px bg-gray-200 my-2"></div>
                <div class="flex justify-between text-lg">
                    <span class="font-bold">Total</span>
                    <span class="font-bold text-blue-600">฿${s.service.price}</span>
                </div>
            </div>
            <p class="text-xs text-center text-gray-400">
                By confirming, you agree to our booking terms.
            </p>
        `;
        container.appendChild(div);
    },

    renderLoading: () => {
        document.getElementById('content').innerHTML = `
            <div class="flex justify-center items-center h-full">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        `;
    },

    validateStep: () => {
        const btnNext = document.getElementById('btn-next');
        let isValid = false;

        switch (State.step) {
            case 0: isValid = !!State.selection.service; break;
            case 1: isValid = !!State.selection.barber; break;
            case 2: isValid = !!State.selection.date && !!State.selection.time; break;
            case 3: isValid = !!State.selection.customer.name && !!State.selection.customer.phone && !!State.selection.slipFile; break;
            case 4: isValid = true; break;
        }

        btnNext.disabled = !isValid;
    },

    nextStep: () => {
        if (State.step < Steps.length - 1) {
            State.step++;
            App.renderStep();
        } else {
            App.submitBooking();
        }
    },

    prevStep: () => {
        if (State.step > 0) {
            State.step--;
            App.renderStep();
        }
    },

    reset: () => {
        // Simple reload for now
        window.location.reload();
    },

    submitBooking: async () => {
        App.renderLoading();
        document.getElementById('btn-next').disabled = true;
        document.getElementById('btn-back').disabled = true;

        // Simulate API call
        setTimeout(() => {
            document.getElementById('content').innerHTML = `
                <div class="flex flex-col items-center justify-center h-full text-center space-y-4 slide-enter">
                    <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-4xl">
                        🎉
                    </div>
                    <h2 class="text-2xl font-bold">Booking Confirmed!</h2>
                    <p class="text-gray-500">We have received your booking.<br>See you on ${State.selection.date} at ${State.selection.time}.</p>
                    <button onclick="App.reset()" class="text-blue-600 font-bold hover:underline">Book Another</button>
                </div>
            `;
            document.querySelector('footer').classList.add('hidden');
        }, 2000);
    }
};

// Start the app
App.init();
