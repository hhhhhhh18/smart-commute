exports.getRecommendation = (options) => {
    let best = null;
  
    for (const key in options) {
      const option = options[key];
  
      // score = balance of cost + time
      const score = option.cost + option.time * 2;
  
      if (!best || score < best.score) {
        best = { ...option, mode: key, score };
      }
    }
  
    return best;
  };