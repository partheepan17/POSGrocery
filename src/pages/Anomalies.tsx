/**
 * Anomalies Page
 * Main page for anomaly detection and management
 */

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { AnomaliesReport } from '@/components/Anomalies/AnomaliesReport';
import { AnomalyRulesConfig } from '@/components/Anomalies/AnomalyRulesConfig';

export const Anomalies: React.FC = () => {
  return (
    <div className="container mx-auto py-6">
      <Tabs defaultValue="report" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="report">Anomalies Report</TabsTrigger>
          <TabsTrigger value="rules">Rules Configuration</TabsTrigger>
        </TabsList>
        
        <TabsContent value="report">
          <AnomaliesReport />
        </TabsContent>
        
        <TabsContent value="rules">
          <AnomalyRulesConfig />
        </TabsContent>
      </Tabs>
    </div>
  );
};










