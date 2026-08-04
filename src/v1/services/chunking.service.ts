import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

export const chunkingService = {
  chunkText: async (text: string, fileName: string, fileId: string) => {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 800,
      chunkOverlap: 100,
    });
    const texts = await splitter.splitText(text);
    return texts.map((content, index) => ({
      id: `${fileId}-chunk-${index}`,
      content,
      index,
      tags: [],
      topic: '',
      section: '',
      sectionNumber: null,
      firstSentence: content.split('.')[0] || ''
    }));
  }
};