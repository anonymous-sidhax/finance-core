import natural from 'natural';
import { supabase } from './supabase';

export class TransactionClassifier {
  constructor() {
    // If a classifier already exists in memory (global scope), use it.
    // This prevents retraining on every single request during development.
    if (global.classifierInstance) {
      this.classifier = global.classifierInstance;
    } else {
      this.classifier = new natural.BayesClassifier();
    }
  }

  // Helper to check if the model is currently trained
  isTrained() {
    // We check if the global instance has been set
    return !!global.classifierInstance;
  }

  // 1. Fetch data from Supabase and train the model
  async train() {
    console.log("Training model from Supabase data...");
    
    // Fetch all categorized transactions from your database
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('description, category, sub_category');

    if (error || !transactions) {
      console.error("Error fetching training data:", error);
      return;
    }

    // Create a fresh classifier instance
    this.classifier = new natural.BayesClassifier();

    if (transactions.length === 0) {
      // Seed with some defaults if the DB is empty so it doesn't crash
      this.classifier.addDocument('Uber', 'Transportation:Rideshare');
      this.classifier.addDocument('Starbucks', 'Dining:Dining');
      this.classifier.train();
    } else {
      // Train with actual data from the DB
      transactions.forEach((t) => {
        // We combine Category and SubCategory into one label (e.g., "Food:Coffee")
        this.classifier.addDocument(t.description, `${t.category}:${t.sub_category}`);
      });
      this.classifier.train();
    }

    // Save this trained instance to the global scope
    global.classifierInstance = this.classifier;
    console.log(`Model trained with ${transactions.length} records.`);
  }

  // 2. Predict the category for a new description
  async classify(description) {
    // Ensure the model is trained before we try to classify
    if (!this.isTrained()) {
      await this.train();
    }

    // Get all classifications (sorted by probability)
    const result = this.classifier.getClassifications(description);
    const topResult = result[0];

    // Threshold: if confidence is too low (or no result), return 'Uncategorized'
    if (!topResult || topResult.value < 0.0001) {
       return { category: 'Uncategorized', sub_category: 'General', confidence: 0 };
    }

    // Split our label back into Category and SubCategory
    const [category, sub_category] = topResult.label.split(':');

    return {
      category,
      sub_category: sub_category || 'General',
      confidence: topResult.value
    };
  }
}

// Export a singleton instance of the class
export const classifierService = new TransactionClassifier();