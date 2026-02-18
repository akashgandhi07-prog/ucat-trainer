// Mock intensity data for the numpad keys
const getKeyIntensity = (_key: string) => {
    // In a real implementation, this would come from a map of average latencies per key
    // For now, let's randomize slightly to show the heatmap effect
    const intensity = Math.random();
    if (intensity > 0.8) return 'bg-red-200 text-red-800';
    if (intensity > 0.5) return 'bg-yellow-200 text-yellow-800';
    return 'bg-slate-100 text-slate-600'; // Neutral
};

export const KeyHeatmap = () => {
    const keys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.'];

    return (
        <div className="mt-6">
            <h3 className="text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider">Latency Heatmap</h3>
            <p className="text-xs text-slate-400 mb-3">Red keys indicate slower average reaction times.</p>
            <div className="grid grid-cols-3 gap-1 w-32 mx-auto">
                {keys.map(key => (
                    <div
                        key={key}
                        className={`
                            h-10 flex items-center justify-center rounded text-sm font-bold
                            ${getKeyIntensity(key)}
                            ${key === '0' ? 'col-span-2' : ''}
                        `}
                    >
                        {key}
                    </div>
                ))}
            </div>
        </div>
    );
};
