import React from 'react';
import { useAppData } from '../../hooks/useAppData';
import { Activity, Server } from 'lucide-react';

const formatLogDate = (dateString: string): string => {
  return new Date(dateString).toLocaleString('pt-BR', {
    dateStyle: 'long',
    timeStyle: 'medium',
  });
};

const Funcionamento: React.FC = () => {
  const { keepAliveLogs } = useAppData();

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="bg-green-100 p-3 rounded-full">
            <Activity className="w-8 h-8 text-green-600" />
        </div>
        <div>
            <h1 className="text-3xl font-bold text-gray-800">Status de Funcionamento</h1>
            <p className="text-gray-500 mt-1">Este registro mostra a atividade diária para manter o banco de dados ativo.</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Histórico de Atividade</h2>
        {keepAliveLogs.length === 0 ? (
          <div className="text-center py-16">
            <Server className="mx-auto h-12 w-12 text-gray-300" />
            <p className="text-gray-500 mt-4">Nenhum registro de atividade encontrado.</p>
            <p className="text-gray-400 text-sm mt-1">A primeira verificação automática deve ocorrer em breve.</p>
          </div>
        ) : (
          <div className="flow-root">
            <ul role="list" className="-mb-8">
              {keepAliveLogs.map((log, logIdx) => (
                <li key={log.id}>
                  <div className="relative pb-8">
                    {logIdx !== keepAliveLogs.length - 1 ? (
                      <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                    ) : null}
                    <div className="relative flex space-x-3 items-center">
                      <div>
                        <span className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center ring-8 ring-white">
                          <Activity className="h-5 w-5 text-white" />
                        </span>
                      </div>
                      <div className="flex min-w-0 flex-1 justify-between space-x-4">
                        <div>
                          <p className="text-sm text-gray-700">
                            Verificação de atividade do sistema executada com sucesso.
                          </p>
                        </div>
                        <div className="whitespace-nowrap text-right text-sm text-gray-500">
                          <time dateTime={log.pinged_at}>{formatLogDate(log.pinged_at)}</time>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default Funcionamento;