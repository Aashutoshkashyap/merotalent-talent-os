import {describe,it,expect} from 'vitest';
import {questionSchema,gradeAssessment,publicQuestion,resultVisibility,type AssessmentQuestion} from '@/lib/events/assessment';
const question=(extra:Record<string,unknown>={}):AssessmentQuestion=>({...questionSchema.parse({question:'Question',question_type:'single',options:[{id:'a',text:'A'},{id:'b',text:'B'}],correct_answer:'a',points:5,answer_rules:{negative_marks:1},...extra}),id:'11111111-1111-4111-8111-111111111111'});
describe('event objective scoring and answer secrecy',()=>{
  it('scores correct, incorrect and unanswered choices on the server',()=>{
    const q=question();expect(gradeAssessment([q],{[q.id]:'a'}).score).toBe(5);expect(gradeAssessment([q],{[q.id]:'b'}).score).toBe(-1);expect(gradeAssessment([q],{}).score).toBe(0);
  });
  it('does not expose answer keys, rules or explanations in student questions',()=>{
    const dto=publicQuestion(question({answer_rules:{explanation:'Secret answer'}}));expect(dto).not.toHaveProperty('correct_answer');expect(dto).not.toHaveProperty('answer_rules');expect(JSON.stringify(dto)).not.toContain('Secret answer');
  });
  it('deduplicates multiple-choice answers and permits partial credit only when configured',()=>{
    const q=question({question_type:'multiple',correct_answer:'["a","b"]'});
    expect(gradeAssessment([q],{[q.id]:['a','a']}).score).toBe(-1);
    expect(gradeAssessment([q],{[q.id]:['b','a','a']}).score).toBe(5);
    const partial=question({question_type:'multiple',correct_answer:'["a","b"]',answer_rules:{partial_credit:true}});
    expect(gradeAssessment([partial],{[partial.id]:['a']}).score).toBe(2.5);
    expect(gradeAssessment([partial],{[partial.id]:['a','forged']}).score).toBe(0);
  });
  it('supports finite numerical tolerance and rejects blank, NaN and infinity',()=>{
    const q=question({question_type:'numerical',correct_answer:'3.14',answer_rules:{tolerance:0.01}});
    expect(gradeAssessment([q],{[q.id]:'3.145'}).score).toBe(5);expect(gradeAssessment([q],{[q.id]:'Infinity'}).score).toBe(0);expect(gradeAssessment([q],{[q.id]:'  '}).score).toBe(0);
    expect(()=>question({question_type:'numerical',correct_answer:'NaN'})).toThrow();
  });
  it('supports configured short-text case sensitivity',()=>{
    const q=question({question_type:'short_text',correct_answer:'Nepal'});expect(gradeAssessment([q],{[q.id]:' nepal '}).score).toBe(5);
    const strict=question({question_type:'short_text',correct_answer:'Nepal',answer_rules:{case_sensitive:true}});expect(gradeAssessment([strict],{[strict.id]:'nepal'}).score).toBe(0);
  });
  it('rejects duplicate option IDs and invalid answer keys',()=>{
    expect(()=>question({options:[{id:'a',text:'A'},{id:'a',text:'Duplicate'}]})).toThrow();expect(()=>question({correct_answer:'unknown'})).toThrow();
  });
  it('allows result publication without leaking reviews during an open competition',()=>{
    const now=new Date('2026-11-01T10:00:00Z');
    expect(resultVisibility({results_publish_at:null,review_answers:true,closes_at:'2026-10-31'},now)).toEqual({published:false,review:false});
    expect(resultVisibility({results_publish_at:'2026-11-01T09:00:00Z',review_answers:true,closes_at:'2026-11-02'},now)).toEqual({published:true,review:false});
    expect(resultVisibility({results_publish_at:'2026-10-31',review_answers:true,closes_at:'2026-10-31'},now)).toEqual({published:true,review:true});
  });
});
