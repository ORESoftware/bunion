// Question, write a function to take two lists,
// input1 and input2, as the input, and return a merged
// list as below # input1 = [1, 2, 3, 4] # input2 = ["a", "b", "c", "d", "e"] # return [1, "a", 2, "b", 3, "c", 4, "d", "e"]

export const mergeLists = (a: Array<any>, b: Array<any>): Array<any> => {
  
  const ret = [], ln = Math.max(a.length, b.length);
  
  for (let i = 0; i < ln; i++) {
    
    if (i < a.length) {
      ret.push(a[i]);
    }
    
    if (i < b.length) {
      ret.push(b[i]);
    }
    
  }
  
  return ret;
  
};

export const mergeListsGeneric = (...args: Array<Array<any>>): Array<any> => {
  
  const ret = [], ln = Math.max(...args.map(v => v.length));
  
  for (let i = 0; i < ln; i++) {
    
    for (const v of args) {
      
      if (i < v.length) {
        ret.push(v[i]);
      }
    }
  }
  
  return ret;
  
};

console.log(
  mergeListsGeneric(
    [1, 2, 3, 4, 5], ["a", "b", "c", "d", "e"], [true, false, true, false, true], [11,22,33,44,55]
  )
);
