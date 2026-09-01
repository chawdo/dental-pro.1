import React from 'react';

const estadoColores = {
  Sano: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600',
  Caries: 'bg-red-500 text-white border-red-600',
  Ausente: 'bg-slate-800 opacity-50 text-white border-slate-900',
  Prótesis: 'bg-purple-500 text-white border-purple-600',
  Implante: 'bg-emerald-500 text-white border-emerald-600',
  Gingivitis: 'bg-orange-500 text-white border-orange-600',
  Periodontitis: 'bg-yellow-600 text-white border-yellow-700'
};

const getSurfaceStyle = (status) => {
  if (!status || status === 'Sano') return 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600';
  if (estadoColores[status]) return estadoColores[status];
  return 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600';
};

const getToothStyle = (status) => {
  if (!status || status === 'Sano') return 'border-slate-300 dark:border-slate-600';
  if (status === 'Ausente') return 'opacity-50 border-slate-900 bg-slate-800 text-white';
  if (status === 'Caries') return 'border-red-600';
  if (status === 'Prótesis') return 'border-purple-600';
  if (status === 'Implante') return 'border-emerald-600';
  if (status === 'Gingivitis') return 'border-orange-600';
  if (status === 'Periodontitis') return 'border-yellow-700';
  return 'border-slate-300 dark:border-slate-600';
};

export const DetailedTooth = ({ numero, toothData, isSelected, onClick, onDropImage }) => {
  const isUpper = numero >= 11 && numero <= 28 || numero >= 51 && numero <= 65;
  const isFrontal = (numero % 10) <= 3;
  const isPremolar = (numero % 10) === 4 || (numero % 10) === 5;

  const status = toothData?.estado || 'Sano';
  const surfaces = toothData?.surfaces || {
    vestibular: 'Sano',
    mesial: 'Sano',
    oclusal: 'Sano',
    distal: 'Sano',
    lingual: 'Sano'
  };

  const isExtracted = status === 'Ausente';
  const overlaidImages = toothData?.images || [];

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (!onDropImage) return;

    const type = e.dataTransfer.getData('imageType');
    if (!type) return;

    // Calculate relative coordinates
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    onDropImage(numero, type, x, y);
  };

  const getToothShape = () => {
    if (isFrontal) {
      return isUpper ? 'rounded-t-xl rounded-b-full' : 'rounded-b-xl rounded-t-full';
    } else if (isPremolar) {
      return 'rounded-xl';
    } else {
      return 'rounded-lg';
    }
  };

  return (
    <div className="relative group flex flex-col items-center">
      {/* Tooltip / Label */}
      <div className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
        {numero}
      </div>

      {/* Raíces del diente (superiores) */}
      {isUpper && (
        <div className="w-full h-3 sm:h-4 flex justify-center mb-1 relative">
          <div className={isExtracted ? 'opacity-30' : ''}>
            {isFrontal ? (
              <div className={`w-1.5 sm:w-2 h-3 sm:h-4 border-2 border-b-0 rounded-t-full shadow-sm ${getToothStyle(status)} bg-slate-100 dark:bg-slate-800`}></div>
            ) : isPremolar ? (
              <div className="flex gap-1">
                <div className={`w-1 sm:w-1.5 h-3 sm:h-4 border-2 border-b-0 rounded-t-full shadow-sm ${getToothStyle(status)} bg-slate-100 dark:bg-slate-800`}></div>
                <div className={`w-1 sm:w-1.5 h-3 sm:h-4 border-2 border-b-0 rounded-t-full shadow-sm ${getToothStyle(status)} bg-slate-100 dark:bg-slate-800`}></div>
              </div>
            ) : (
              <div className="flex gap-0.5">
                <div className={`w-0.5 sm:w-1 h-3 sm:h-4 border-2 border-b-0 rounded-t-full shadow-sm ${getToothStyle(status)} bg-slate-100 dark:bg-slate-800`}></div>
                <div className={`w-0.5 sm:w-1 h-3 sm:h-4 border-2 border-b-0 rounded-t-full shadow-sm ${getToothStyle(status)} bg-slate-100 dark:bg-slate-800`}></div>
                <div className={`w-0.5 sm:w-1 h-3 sm:h-4 border-2 border-b-0 rounded-t-full shadow-sm ${getToothStyle(status)} bg-slate-100 dark:bg-slate-800`}></div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Diente principal */}
      <div
        className="w-8 h-12 sm:w-10 sm:h-16 relative"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <button
          type="button"
          className={`
            w-full h-8 sm:h-12 border-2 transition-all duration-200
            ${getToothShape()}
            ${getToothStyle(status)}
            ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900' : ''}
            ${isExtracted ? 'opacity-40 bg-slate-800' : 'bg-white dark:bg-slate-800 hover:scale-105 hover:shadow-lg'}
            cursor-pointer flex items-center justify-center relative overflow-hidden shadow-sm
          `}
          onClick={() => onClick(numero)}
          title={`Diente ${numero}`}
        >
          {/* Grid de superficies visibles */}
          <div className="absolute inset-0.5 grid grid-cols-3 grid-rows-3 gap-0.5">
            {/* Vestibular (arriba) */}
            <div className={`col-start-2 row-start-1 rounded-sm border border-slate-300 dark:border-slate-600 ${getSurfaceStyle(surfaces.vestibular)}`} title="Vestibular" />

            {/* Mesial (izquierda) */}
            <div className={`col-start-1 row-start-2 rounded-sm border border-slate-300 dark:border-slate-600 ${getSurfaceStyle(surfaces.mesial)}`} title="Mesial" />

            {/* Oclusal (centro) */}
            <div className={`col-start-2 row-start-2 rounded-sm border border-slate-300 dark:border-slate-600 ${getSurfaceStyle(surfaces.oclusal)}`} title="Oclusal" />

            {/* Distal (derecha) */}
            <div className={`col-start-3 row-start-2 rounded-sm border border-slate-300 dark:border-slate-600 ${getSurfaceStyle(surfaces.distal)}`} title="Distal" />

            {/* Lingual (abajo) */}
            <div className={`col-start-2 row-start-3 rounded-sm border border-slate-300 dark:border-slate-600 ${getSurfaceStyle(surfaces.lingual)}`} title="Lingual" />
          </div>

          {/* Marca de extracción */}
          {isExtracted && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-10 h-0.5 bg-red-500 rotate-45"></div>
              <div className="w-10 h-0.5 bg-red-500 -rotate-45 absolute"></div>
            </div>
          )}

          {/* Overlaid images via drag and drop */}
          {overlaidImages.map((img, idx) => (
            <div
              key={idx}
              className="absolute text-[10px] pointer-events-none select-none z-10"
              style={{
                left: `${img.x}%`,
                top: `${img.y}%`,
                transform: `translate(-50%, -50%) scale(${img.scale || 1})`,
              }}
            >
              {img.type === 'bracket' && '🔲'}
              {img.type === 'caries_icon' && '🔴'}
              {img.type === 'implante_icon' && '🔩'}
              {img.type === 'endodoncia_icon' && '⚡'}
            </div>
          ))}
        </button>

        {/* Raíces del diente (inferiores) */}
        {!isUpper && (
          <div className="w-full h-3 sm:h-4 flex justify-center mt-1 relative">
            <div className={isExtracted ? 'opacity-30' : ''}>
              {isFrontal ? (
                <div className={`w-1.5 sm:w-2 h-3 sm:h-4 border-2 border-t-0 rounded-b-full shadow-sm ${getToothStyle(status)} bg-slate-100 dark:bg-slate-800`}></div>
              ) : isPremolar ? (
                <div className="flex gap-1">
                  <div className={`w-1 sm:w-1.5 h-3 sm:h-4 border-2 border-t-0 rounded-b-full shadow-sm ${getToothStyle(status)} bg-slate-100 dark:bg-slate-800`}></div>
                  <div className={`w-1 sm:w-1.5 h-3 sm:h-4 border-2 border-t-0 rounded-b-full shadow-sm ${getToothStyle(status)} bg-slate-100 dark:bg-slate-800`}></div>
                </div>
              ) : (
                <div className="flex gap-0.5">
                  <div className={`w-0.5 sm:w-1 h-3 sm:h-4 border-2 border-t-0 rounded-b-full shadow-sm ${getToothStyle(status)} bg-slate-100 dark:bg-slate-800`}></div>
                  <div className={`w-0.5 sm:w-1 h-3 sm:h-4 border-2 border-t-0 rounded-b-full shadow-sm ${getToothStyle(status)} bg-slate-100 dark:bg-slate-800`}></div>
                  <div className={`w-0.5 sm:w-1 h-3 sm:h-4 border-2 border-t-0 rounded-b-full shadow-sm ${getToothStyle(status)} bg-slate-100 dark:bg-slate-800`}></div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
