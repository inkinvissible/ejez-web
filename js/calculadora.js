(function () {
    "use strict";

    // Elements
    const inputUsuarios = document.getElementById("calc-usuarios");
    const inputCostoHora = document.getElementById("calc-costo-hora");
    const selectCurrency = document.getElementById("calc-currency");
    const inputBusquedas = document.getElementById("calc-busquedas");
    const inputDobleCarga = document.getElementById("calc-doble-carga");
    
    const outputAnual = document.getElementById("output-anual");
    const output5Years = document.getElementById("output-5-years");
    const textProblem = document.getElementById("calc-problem-texto");
    const currencySigns = document.querySelectorAll(".impact-currency-sign");

    const DTO_DIAS_LABORABLES_ANUALES = 240;

    // Number formatters
    const formatNumber = (num, currency) => {
        return new Intl.NumberFormat('es-AR', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(num);
    };

    const animateValueUpdate = (element) => {
        element.classList.remove('value-update-anim');
        // Trigger reflow
        void element.offsetWidth;
        element.classList.add('value-update-anim');
    };

    const calculateInefficiency = () => {
        // Parse inputs
        const usuarios = Math.max(0, parseInt(inputUsuarios.value) || 0);
        const costoHora = Math.max(0, parseFloat(inputCostoHora.value) || 0);
        const tiemBusc = Math.max(0, parseFloat(inputBusquedas.value) || 0);
        const tiemCarg = Math.max(0, parseFloat(inputDobleCarga.value) || 0);
        const currency = selectCurrency.value.toUpperCase();

        // Calculations
        const horasPerdidasPorUsuario = tiemBusc + tiemCarg;
        const totalHorasPerdidasDia = horasPerdidasPorUsuario * usuarios;
        const perdidaDiaria = totalHorasPerdidasDia * costoHora;
        
        const perdidaAnual = perdidaDiaria * DTO_DIAS_LABORABLES_ANUALES;
        const perdida5Anios = perdidaAnual * 5;

        // Update DOM
        const formattedAnual = formatNumber(perdidaAnual, currency);
        const formatted5Years = formatNumber(perdida5Anios, currency);

        if (outputAnual.innerText !== formattedAnual) {
            outputAnual.innerText = formattedAnual;
            animateValueUpdate(outputAnual);
        }

        if (output5Years.innerText !== formatted5Years) {
            output5Years.innerText = formatted5Years;
            animateValueUpdate(output5Years);
        }

        // Update Text
        textProblem.innerText = `Cada persona de tu equipo pierde en promedio ${horasPerdidasPorUsuario} horas de su jornada navegando un sistema lento, copiando datos o esperando al sistema (equivalente a una pérdida de ${totalHorasPerdidasDia} horas-hombre al día a nivel empresa).`;

        // Update currency signs
        currencySigns.forEach(sign => {
            sign.innerText = currency === 'USD' ? 'u$s' : '$';
        });
    };

    // Event Listeners
    if (inputUsuarios) {
        [inputUsuarios, inputCostoHora, selectCurrency, inputBusquedas, inputDobleCarga].forEach(input => {
            input.addEventListener('input', calculateInefficiency);
        });

        // Initialize
        calculateInefficiency();
    }

})();
