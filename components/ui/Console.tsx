
import React, { useState } from 'react';
import { useLogger } from '../../hooks/useLogger';
import { LogLevel, LogEntry } from '../../context/LoggerContext';
import { ChevronUp, ChevronDown, Trash2, ServerCrash, AlertTriangle, Info } from 'lucide-react';

const LogLevelIndicator: React.FC<{ level: LogLevel }> = ({ level }) => {
    switch (level) {
        case LogLevel.ERROR:
            return <ServerCrash className="w-4 h-4 text-red-400 flex-shrink-0" />;
        case LogLevel.WARN:
            return <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />;
        case LogLevel.INFO:
        default:
            return <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />;
    }
};


const LogLine: React.FC<{ entry: LogEntry }> = ({ entry }) => {
  const [isDataVisible, setIsDataVisible] = useState(false);
  
  const levelColorClass = {
    [LogLevel.INFO]: 'text-gray-300',
    [LogLevel.WARN]: 'text-yellow-400',
    [LogLevel.ERROR]: 'text-red-400',
  }[entry.level];

  return (
    <div className="border-b border-gray-700 py-2 font-mono text-sm">
        <div className={`flex items-start gap-3 ${levelColorClass}`}>
            <LogLevelIndicator level={entry.level} />
            <span className="text-gray-500 flex-shrink-0">{entry.timestamp.toLocaleTimeString()}</span>
            <p className="flex-grow whitespace-pre-wrap break-words">{entry.message}</p>
             {entry.data && (
                <button 
                    onClick={() => setIsDataVisible(!isDataVisible)}
                    className="text-gray-400 hover:text-white"
                    title="Toggle details"
                >
                    {isDataVisible ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
            )}
        </div>
      {isDataVisible && entry.data && (
        <pre className="mt-2 p-2 bg-gray-900 rounded-md text-xs text-cyan-300 overflow-x-auto">
          {JSON.stringify(entry.data, null, 2)}
        </pre>
      )}
    </div>
  );
};


const Console: React.FC = () => {
    const { logs, clear } = useLogger();
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[100]">
            <header 
                className="bg-gray-800 text-white flex justify-between items-center p-2 border-t-2 border-blue-500 cursor-pointer shadow-lg"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-2 font-mono">
                    <span className="font-bold">CONSOLE</span>
                    <span className={`px-2 py-0.5 text-xs rounded ${logs.length > 0 ? (logs[0].level === LogLevel.ERROR ? 'bg-red-500' : 'bg-gray-600') : 'bg-gray-600'}`}>{logs.length}</span>
                </div>
                 <div className="flex items-center gap-4">
                    <button 
                        onClick={(e) => { e.stopPropagation(); clear(); }}
                        className="text-gray-400 hover:text-white"
                        title="Clear console"
                    >
                        <Trash2 size={16} />
                    </button>
                    <button className="text-gray-400 hover:text-white" title={isOpen ? 'Collapse' : 'Expand'}>
                        {isOpen ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                    </button>
                </div>
            </header>
            {isOpen && (
                <div className="bg-gray-800/95 backdrop-blur-sm text-white h-80 overflow-y-auto px-4 pb-4 flex flex-col-reverse">
                   {logs.length > 0 ? (
                        <div>
                           {logs.map((log, index) => <LogLine key={index} entry={log} />)}
                        </div>
                   ) : (
                       <div className="flex items-center justify-center h-full text-gray-500">
                           <p>Nenhum log para exibir.</p>
                       </div>
                   )}
                </div>
            )}
        </div>
    );
};

export default Console;
